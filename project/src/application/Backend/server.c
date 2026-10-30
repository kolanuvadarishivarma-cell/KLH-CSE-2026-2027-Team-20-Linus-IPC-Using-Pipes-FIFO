/* ==========================================================================
 *  server.c
 *  THE BACKEND - written in C, matching the OSSP course requirement.
 *  Operating Systems and Systems Programming (25CS2104E) | Section 4, Team 20
 *
 * --------------------------------------------------------------------------
 *  WHAT THIS FILE DOES
 *  --------------------------------------------------------------------------
 *  Two things, layered on top of each other:
 *
 *   1. THE REAL OS WORK (this is your actual project):
 *        mkfifo(), open(), read(), write(), close()
 *      Two named pipes carry chat messages between two independent
 *      backend processes - one running as "A", one as "B".
 *
 *   2. A TINY HAND-WRITTEN HTTP SERVER (this is just plumbing):
 *        socket(), bind(), listen(), accept(), read(), write()
 *      This exists ONLY so a web browser can talk to this program. It
 *      serves the frontend's files (index.html/style.css/script.js) and
 *      answers two requests from that frontend:
 *          GET  /messages   -> "any new messages?"
 *          POST /send       -> "the user typed this, send it"
 *
 *  The frontend has ZERO knowledge of pipes or FIFOs. It only ever talks
 *  to this backend over plain HTTP - which is why the exact same
 *  frontend files work completely unchanged whether this backend is
 *  written in C (this file) or Python (the earlier version).
 *
 * --------------------------------------------------------------------------
 *  BUILD
 *      gcc -Wall -Wextra -pthread -o server server.c
 *
 *  RUN (two terminals, like two phones)
 *      ./server A 5001
 *      ./server B 5002
 *
 *  Then open in a browser:
 *      http://localhost:5001   (User A)
 *      http://localhost:5002   (User B)
 * ========================================================================== */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>      /* strncasecmp - reading HTTP headers case-insensitively */
#include <signal.h>        /* ignore SIGPIPE if a browser disconnects mid-response  */
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <pthread.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

/* --------------------------- CONFIGURATION ------------------------------ */
#define FIFO_A_TO_B  "/tmp/relay_a_to_b"   /* A writes here, B reads here   */
#define FIFO_B_TO_A  "/tmp/relay_b_to_a"   /* B writes here, A reads here   */
#define FRONTEND_DIR "../frontend"          /* where index.html/css/js live  */

#define MAX_MESSAGES 512
#define MAX_TEXT_LEN 512
#define READ_CHUNK   256

/* --------------------------- SHARED STATE --------------------------------
 * These variables are shared between the HTTP-handling threads and the
 * two background IPC threads (writer_thread, reader_thread). A mutex
 * protects the message list because several threads may touch it at the
 * same time (e.g. a browser polling while a message just arrived).
 * -------------------------------------------------------------------- */
typedef struct {
    int  id;
    char from[8];              /* "me", "peer", or "system" */
    char text[MAX_TEXT_LEN];
} Message;

static Message      messages[MAX_MESSAGES];
static int          message_count = 0;
static int          next_id       = 1;
static pthread_mutex_t lock       = PTHREAD_MUTEX_INITIALIZER;

static int          writer_fd      = -1;   /* real fd once connected        */
static volatile int peer_connected = 0;

static const char *my_label;
static const char *peer_label;
static const char *active_write_path = "";
static const char *active_read_path  = "";

/* -------------------- UNNAMED PIPE SESSION STATE ------------------------
 * Enables the user to give inputs to the Parent process BEFORE creating
 * the child. When fork() is called, the child reads and receives all inputs.
 * ----------------------------------------------------------------------- */
#define MAX_UNNAMED_INPUTS 32
static int   unnamed_pipefd[2] = {-1, -1};
static char  unnamed_inputs[MAX_UNNAMED_INPUTS][MAX_TEXT_LEN];
static int   unnamed_input_count = 0;
static pthread_mutex_t unnamed_lock = PTHREAD_MUTEX_INITIALIZER;

/* Adds a message to the shared history. Thread-safe. */
static void add_message(const char *from, const char *text)
{
    pthread_mutex_lock(&lock);
    if (message_count < MAX_MESSAGES) {
        Message *m = &messages[message_count++];
        m->id = next_id++;
        snprintf(m->from, sizeof(m->from), "%s", from);
        snprintf(m->text, sizeof(m->text), "%s", text);
    }
    pthread_mutex_unlock(&lock);
}

/* ==========================================================================
 *  THE ACTUAL OS / IPC WORK
 *  These two functions are the entire reason this project exists. Everything
 *  below them (the HTTP server) only exists to expose this to a browser.
 * ========================================================================== */

/* Opens our OUTGOING fifo for writing.
 * open() BLOCKS here until the other backend opens the same FIFO for
 * reading - that blocking behaviour IS the synchronization between the
 * two chat programs. Runs on its own thread so the web server can keep
 * serving pages while this wait happens. */
static void *writer_thread(void *arg)
{
    const char *path = (const char *)arg;
    int fd = open(path, O_WRONLY);          /* <-- real system call, blocks */
    if (fd == -1) { perror("writer open() failed"); return NULL; }
    writer_fd = fd;
    peer_connected = 1;
    printf("\n============================================================\n");
    printf("[FIFO CONNECTED] %s connected to %s!\n", my_label, peer_label);
    printf("[FIFO CONNECTED] Opened %s (Write FD: %d)\n", path, fd);
    printf("============================================================\n");
    fflush(stdout);
    return NULL;
}

/* Opens our INCOMING fifo for reading and loops forever.
 * A FIFO is a byte stream, not labeled packets, so every message is
 * terminated with '\0' by the sender and we split on that here - same
 * framing rule as the plain command-line version of this project. */
static void *reader_thread(void *arg)
{
    const char *path = (const char *)arg;
    char buf[4096];
    size_t buf_len = 0;

    while (1) {
        int fd = open(path, O_RDONLY);      /* <-- real system call, blocks */
        if (fd == -1) { perror("reader open() failed"); return NULL; }

        buf_len = 0;
        while (1) {
            char chunk[READ_CHUNK];
            ssize_t n = read(fd, chunk, sizeof(chunk));  /* <-- real read() */
            if (n <= 0) break;                            /* 0 = EOF        */

            if (buf_len + (size_t)n > sizeof(buf))        /* safety guard   */
                buf_len = 0;

            memcpy(buf + buf_len, chunk, (size_t)n);
            buf_len += (size_t)n;

            /* pull out every complete '\0'-terminated message we now have */
            size_t start = 0;
            for (size_t i = 0; i < buf_len; i++) {
                if (buf[i] == '\0') {
                    add_message("peer", buf + start);
                    printf("\n[FIFO RECV] << Message arrived from %s (via %s):\n", peer_label, path);
                    printf("             \"%s\"\n", buf + start);
                    fflush(stdout);
                    start = i + 1;
                }
            }
            size_t remaining = buf_len - start;
            memmove(buf, buf + start, remaining);
            buf_len = remaining;
        }
        close(fd);
        add_message("system", "The other person left the chat.");
        /* loop back and wait for the peer to reconnect */
    }
    return NULL;
}

/* ==========================================================================
 *  TINY HELPERS: reading files, escaping/parsing JSON
 *  (Plumbing only - not the OS concept being demonstrated.)
 * ========================================================================== */

/* Reads an entire file into a malloc'd buffer. Caller must free() it. */
static char *read_file(const char *path, size_t *out_len)
{
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    long size = ftell(f);
    fseek(f, 0, SEEK_SET);
    char *buf = malloc((size_t)size);
    if (buf) fread(buf, 1, (size_t)size, f);
    fclose(f);
    if (out_len) *out_len = (size_t)size;
    return buf;
}

/* Writes one JSON string value's worth of escaping into out (bounded). */
static void json_escape(const char *in, char *out, size_t out_size)
{
    size_t j = 0;
    for (size_t i = 0; in[i] && j + 2 < out_size; i++) {
        char c = in[i];
        if (c == '"' || c == '\\') { out[j++] = '\\'; out[j++] = c; }
        else if (c == '\n')        { out[j++] = '\\'; out[j++] = 'n'; }
        else                        out[j++] = c;
    }
    out[j] = '\0';
}

/* A MINIMAL JSON parser - just enough to pull the "text" field out of
 * {"text":"..."}. Not a general-purpose JSON parser; good enough for the
 * one fixed shape of request this project sends. */
static void extract_text_field(const char *body, char *out, size_t out_size)
{
    out[0] = '\0';
    const char *key = strstr(body, "\"text\"");
    if (!key) return;
    const char *colon = strchr(key, ':');
    if (!colon) return;
    const char *quote1 = strchr(colon, '"');
    if (!quote1) return;
    quote1++;

    size_t j = 0;
    for (const char *p = quote1; *p && j + 1 < out_size; p++) {
        if (*p == '"') break;                 /* end of the string value   */
        if (*p == '\\' && *(p + 1)) {          /* handle \" \\ \n etc.      */
            p++;
            if (*p == 'n') out[j++] = '\n';
            else            out[j++] = *p;
        } else {
            out[j++] = *p;
        }
    }
    out[j] = '\0';
}

/* ==========================================================================
 *  THE HTTP SERVER (hand-written, using raw sockets)
 * ========================================================================== */

static void send_all(int fd, const char *data, size_t len)
{
    size_t sent = 0;
    while (sent < len) {
        ssize_t n = write(fd, data + sent, len - sent);
        if (n <= 0) return;
        sent += (size_t)n;
    }
}

static void send_response(int client, int code, const char *content_type,
                           const char *body, size_t body_len)
{
    char header[512];
    const char *status_text = (code == 200) ? "OK" :
                               (code == 404) ? "Not Found" : "Service Unavailable";
    int header_len = snprintf(header, sizeof(header),
        "HTTP/1.1 %d %s\r\n"
        "Content-Type: %s\r\n"
        "Content-Length: %zu\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
        "Access-Control-Allow-Headers: Content-Type\r\n"
        "Connection: close\r\n"
        "\r\n",
        code, status_text, content_type, body_len);
    send_all(client, header, (size_t)header_len);
    if (body_len > 0) send_all(client, body, body_len);
}

static void serve_file(int client, const char *relative_path, const char *content_type)
{
    char full_path[512];
    snprintf(full_path, sizeof(full_path), "../Frontend%s", relative_path);
    size_t len = 0;
    char *data = read_file(full_path, &len);
    if (!data) {
        snprintf(full_path, sizeof(full_path), "../frontend%s", relative_path);
        data = read_file(full_path, &len);
    }
    if (!data) {
        snprintf(full_path, sizeof(full_path), "./Frontend%s", relative_path);
        data = read_file(full_path, &len);
    }
    if (!data) {
        snprintf(full_path, sizeof(full_path), "./frontend%s", relative_path);
        data = read_file(full_path, &len);
    }
    if (!data) { send_response(client, 404, "text/plain", "Not found", 9); return; }

    send_response(client, 200, content_type, data, len);
    free(data);
}

/* ==========================================================================
 *  UNNAMED PIPES IMPLEMENTATION (pipe() + fork())
 *  1. User gives inputs to Parent process BEFORE child is created.
 *     Inputs are written to pipefd[1] and sit in the Linux kernel pipe buffer.
 *  2. User triggers fork().
 *  3. Child process reads and receives ALL queued inputs from pipefd[0].
 *  4. Full traces are printed in the backend terminal!
 * ========================================================================== */

static void handle_unnamed_input(int client, const char *request_body)
{
    char text[MAX_TEXT_LEN];
    extract_text_field(request_body, text, sizeof(text));

    if (text[0] == '\0') {
        send_response(client, 400, "application/json", "{\"error\":\"Empty input text\"}", 28);
        return;
    }

    pthread_mutex_lock(&unnamed_lock);

    /* Allocate the unnamed pipe if not already open */
    if (unnamed_pipefd[0] == -1) {
        if (pipe(unnamed_pipefd) == -1) {
            pthread_mutex_unlock(&unnamed_lock);
            perror("pipe creation failed");
            send_response(client, 500, "application/json", "{\"error\":\"pipe creation failed\"}", 32);
            return;
        }
        printf("\n============================================================\n");
        printf("[UNNAMED PIPE - PARENT (PID %d)] pipe(fd) called by Parent!\n", getpid());
        printf("[UNNAMED PIPE - PARENT (PID %d)] Allocated Read fd[0]=%d, Write fd[1]=%d\n",
               getpid(), unnamed_pipefd[0], unnamed_pipefd[1]);
        printf("[UNNAMED PIPE - PARENT (PID %d)] Kernel circular buffer allocated in RAM.\n", getpid());
        printf("============================================================\n");
        fflush(stdout);
    }

    if (unnamed_input_count >= MAX_UNNAMED_INPUTS) {
        pthread_mutex_unlock(&unnamed_lock);
        send_response(client, 400, "application/json", "{\"error\":\"Input queue full\"}", 26);
        return;
    }

    /* Write input into pipefd[1] with null byte delimiter */
    write(unnamed_pipefd[1], text, strlen(text));
    write(unnamed_pipefd[1], "\0", 1);

    snprintf(unnamed_inputs[unnamed_input_count], sizeof(unnamed_inputs[0]), "%s", text);
    unnamed_input_count++;

    printf("[UNNAMED PIPE - PARENT (PID %d)] Queued Input #%d: \"%s\"\n",
           getpid(), unnamed_input_count, text);
    printf("                                -> Written to pipefd[1]=%d (stored in kernel buffer)\n", unnamed_pipefd[1]);
    printf("                                -> NOTE: Child process does NOT exist yet!\n");
    fflush(stdout);

    /* Build JSON response containing all currently queued inputs */
    char body[4096];
    size_t pos = 0;
    pos += snprintf(body + pos, sizeof(body) - pos,
        "{\"status\":\"queued\",\"parent_pid\":%d,\"count\":%d,\"input\":\"%s\",\"inputs\":[",
        getpid(), unnamed_input_count, text);
    for (int i = 0; i < unnamed_input_count; i++) {
        char esc[MAX_TEXT_LEN * 2];
        json_escape(unnamed_inputs[i], esc, sizeof(esc));
        pos += snprintf(body + pos, sizeof(body) - pos, "%s\"%s\"", (i == 0 ? "" : ","), esc);
    }
    pos += snprintf(body + pos, sizeof(body) - pos, "]}");

    pthread_mutex_unlock(&unnamed_lock);
    send_response(client, 200, "application/json", body, pos);
}

static void handle_unnamed_fork(int client)
{
    pthread_mutex_lock(&unnamed_lock);

    if (unnamed_input_count == 0 || unnamed_pipefd[0] == -1) {
        pthread_mutex_unlock(&unnamed_lock);
        send_response(client, 400, "application/json",
            "{\"error\":\"No inputs given to Parent yet! Please add at least 1 input before creating child.\"}", 94);
        return;
    }

    printf("\n============================================================\n");
    printf("[UNNAMED PIPE - FORK INITIATED]\n");
    printf("[UNNAMED PIPE - PARENT (PID %d)] Inputs queued in pipe before fork: %d\n",
           getpid(), unnamed_input_count);
    printf("[UNNAMED PIPE - PARENT (PID %d)] Calling fork() to create Child process...\n", getpid());
    printf("============================================================\n");
    fflush(stdout);

    /* Pipe used to pass child's read confirmation back to parent for HTTP response */
    int c2p[2];
    if (pipe(c2p) == -1) {
        pthread_mutex_unlock(&unnamed_lock);
        send_response(client, 500, "application/json", "{\"error\":\"feedback pipe failed\"}", 32);
        return;
    }

    pid_t child_pid = fork();

    if (child_pid < 0) {
        pthread_mutex_unlock(&unnamed_lock);
        perror("fork failed");
        send_response(client, 500, "application/json", "{\"error\":\"fork() failed\"}", 24);
        return;
    }

    if (child_pid == 0) {
        /* ----------------------- CHILD PROCESS ----------------------- */
        close(unnamed_pipefd[1]);  /* Close parent's write end in child */
        close(c2p[0]);             /* Close child-to-parent read end    */

        printf("\n[UNNAMED PIPE - CHILD (PID %d)] CREATED via fork() from Parent (PPID: %d)!\n",
               getpid(), getppid());
        printf("[UNNAMED PIPE - CHILD (PID %d)] Closed unused write end fd[1]=%d\n",
               getpid(), unnamed_pipefd[1]);
        printf("[UNNAMED PIPE - CHILD (PID %d)] Now reading all inputs from pipefd[0]=%d...\n",
               getpid(), unnamed_pipefd[0]);
        fflush(stdout);

        char chunk[READ_CHUNK];
        char read_buf[4096];
        size_t read_len = 0;
        int received_count = 0;

        while (1) {
            ssize_t n = read(unnamed_pipefd[0], chunk, sizeof(chunk));
            if (n <= 0) break; /* 0 = EOF */

            if (read_len + (size_t)n > sizeof(read_buf)) break;
            memcpy(read_buf + read_len, chunk, (size_t)n);
            read_len += (size_t)n;

            size_t start = 0;
            for (size_t i = 0; i < read_len; i++) {
                if (read_buf[i] == '\0') {
                    received_count++;
                    printf("[UNNAMED PIPE - CHILD (PID %d)] >> RECEIVED INPUT #%d: \"%s\"\n",
                           getpid(), received_count, read_buf + start);
                    fflush(stdout);
                    start = i + 1;
                }
            }
            size_t rem = read_len - start;
            memmove(read_buf, read_buf + start, rem);
            read_len = rem;
        }

        printf("[UNNAMED PIPE - CHILD (PID %d)] Reached EOF on pipefd[0]. Total inputs received: %d.\n",
               getpid(), received_count);
        printf("[UNNAMED PIPE - CHILD (PID %d)] All parent inputs processed cleanly. Child exiting.\n", getpid());
        fflush(stdout);

        /* Send count confirmation to parent */
        write(c2p[1], &received_count, sizeof(int));
        close(unnamed_pipefd[0]);
        close(c2p[1]);
        _exit(0);

    } else {
        /* ----------------------- PARENT PROCESS ----------------------- */
        close(unnamed_pipefd[1]);  /* Close write end in parent so child receives EOF */
        close(c2p[1]);             /* Close write end of feedback pipe */

        int child_recv_count = 0;
        read(c2p[0], &child_recv_count, sizeof(int));
        close(c2p[0]);

        int status = 0;
        waitpid(child_pid, &status, 0);

        printf("\n[UNNAMED PIPE - PARENT (PID %d)] waitpid() collected Child (PID: %d). Exit code: %d\n",
               getpid(), (int)child_pid, WEXITSTATUS(status));
        printf("[UNNAMED PIPE - PARENT (PID %d)] Communication complete! Pipe buffer destroyed.\n", getpid());
        printf("============================================================\n\n");
        fflush(stdout);

        /* Build JSON response */
        char body[8192];
        size_t pos = 0;
        pos += snprintf(body + pos, sizeof(body) - pos,
            "{\"success\":true,\"parent_pid\":%d,\"child_pid\":%d,\"count\":%d,\"inputs\":[",
            getpid(), (int)child_pid, unnamed_input_count);
        for (int i = 0; i < unnamed_input_count; i++) {
            char esc[MAX_TEXT_LEN * 2];
            json_escape(unnamed_inputs[i], esc, sizeof(esc));
            pos += snprintf(body + pos, sizeof(body) - pos, "%s\"%s\"", (i == 0 ? "" : ","), esc);
        }
        pos += snprintf(body + pos, sizeof(body) - pos, "]}");

        /* Reset state for next unnamed pipe demo */
        close(unnamed_pipefd[0]);
        unnamed_pipefd[0] = -1;
        unnamed_pipefd[1] = -1;
        unnamed_input_count = 0;

        pthread_mutex_unlock(&unnamed_lock);
        send_response(client, 200, "application/json", body, pos);
    }
}

static void handle_unnamed_reset(int client)
{
    pthread_mutex_lock(&unnamed_lock);
    if (unnamed_pipefd[0] != -1) {
        close(unnamed_pipefd[0]);
        close(unnamed_pipefd[1]);
        unnamed_pipefd[0] = -1;
        unnamed_pipefd[1] = -1;
    }
    unnamed_input_count = 0;
    printf("[UNNAMED PIPE] State reset. Ready for new inputs.\n");
    fflush(stdout);
    pthread_mutex_unlock(&unnamed_lock);

    send_response(client, 200, "application/json", "{\"status\":\"reset\"}", 18);
}

static void handle_messages(int client, const char *query)
{
    int after = 0;
    if (query) sscanf(query, "after=%d", &after);

    char body[8192];
    size_t pos = 0;
    pos += (size_t)snprintf(body + pos, sizeof(body) - pos,
        "{\"connected\":%s,\"my_label\":\"%s\",\"peer_label\":\"%s\",\"messages\":[",
        peer_connected ? "true" : "false", my_label, peer_label);

    pthread_mutex_lock(&lock);
    int first = 1;
    for (int i = 0; i < message_count; i++) {
        if (messages[i].id <= after) continue;
        char escaped[MAX_TEXT_LEN * 2];
        json_escape(messages[i].text, escaped, sizeof(escaped));
        pos += (size_t)snprintf(body + pos, sizeof(body) - pos,
            "%s{\"id\":%d,\"from\":\"%s\",\"text\":\"%s\"}",
            first ? "" : ",", messages[i].id, messages[i].from, escaped);
        first = 0;
        if (pos > sizeof(body) - 300) break;   /* stay safely inside the buffer */
    }
    pthread_mutex_unlock(&lock);

    pos += (size_t)snprintf(body + pos, sizeof(body) - pos, "]}");
    send_response(client, 200, "application/json", body, pos);
}

static void handle_send(int client, const char *request_body)
{
    char text[MAX_TEXT_LEN];
    extract_text_field(request_body, text, sizeof(text));

    if (text[0] != '\0' && writer_fd != -1) {
        /* THE REAL IPC CALL - writes null-terminated string to FIFO */
        write(writer_fd, text, strlen(text));
        write(writer_fd, "\0", 1);
        add_message("me", text);
        printf("\n[FIFO SEND] >> %s sent message: \"%s\"\n", my_label, text);
        printf("            Written to named pipe: %s\n", active_write_path);
        fflush(stdout);
        send_response(client, 200, "text/plain", "", 0);
    } else if (text[0] == '\0') {
        printf("[FIFO SEND] ignored: empty text\n");
        fflush(stdout);
        send_response(client, 503, "text/plain", "", 0);
    } else {
        printf("[FIFO SEND] blocked: %s has not connected yet via %s\n", peer_label, active_write_path);
        fflush(stdout);
        send_response(client, 503, "text/plain", "", 0);
    }
}

/* Finds the value of the "Content-Length" header, case-insensitively.
 * Browsers may send "Content-Length" or "content-length" - HTTP header
 * names are not case-sensitive, so we must not assume one exact casing. */
static int find_content_length(const char *request)
{
    const char *p = request;
    while (*p) {
        if (strncasecmp(p, "Content-Length:", 15) == 0) {
            return atoi(p + 15);
        }
        const char *nl = strstr(p, "\r\n");
        if (!nl) break;
        p = nl + 2;
    }
    return 0;
}

/* Handles one HTTP connection from start to finish, then closes it.
 * Each connection runs on its own thread (see main()'s accept loop). */
static void *handle_client(void *arg)
{
    int client = (int)(intptr_t)arg;
    static const size_t BUF_CAP = 16384;
    char *request = malloc(BUF_CAP);
    if (!request) { close(client); return NULL; }

    ssize_t n = read(client, request, BUF_CAP - 1);
    if (n <= 0) { free(request); close(client); return NULL; }
    request[n] = '\0';

    /* --------------------------------------------------------------------
     * THE ACTUAL BUG FIX: a browser's request can arrive across MULTIPLE
     * read() calls - headers in one, part or all of the body in another.
     * A single read() is not guaranteed to capture everything at once.
     * So: find how many body bytes Content-Length says to expect, and if
     * we don't have that many yet, keep calling read() until we do.
     * -------------------------------------------------------------------- */
    char *hdr_end = strstr(request, "\r\n\r\n");
    if (hdr_end) {
        int content_length = find_content_length(request);
        size_t header_bytes = (size_t)(hdr_end + 4 - request);
        size_t body_have = (size_t)n - header_bytes;

        while (content_length > 0
               && body_have < (size_t)content_length
               && (size_t)n < BUF_CAP - 1) {
            ssize_t extra = read(client, request + n, BUF_CAP - 1 - (size_t)n);
            if (extra <= 0) break;
            n += extra;
            body_have += (size_t)extra;
            request[n] = '\0';
        }
    }

    char method[8] = {0}, path[256] = {0};
    sscanf(request, "%7s %255s", method, path);

    /* split "/messages?after=5" into path="/messages" and query="after=5" */
    char *query = strchr(path, '?');
    if (query) { *query = '\0'; query++; }

    if (strcmp(method, "GET") == 0) {
        if      (strcmp(path, "/") == 0)             serve_file(client, "/index.html", "text/html");
        else if (strcmp(path, "/style.css") == 0)    serve_file(client, "/style.css", "text/css");
        else if (strcmp(path, "/script.js") == 0)    serve_file(client, "/script.js", "application/javascript");
        else if (strcmp(path, "/messages") == 0)     handle_messages(client, query);
        else send_response(client, 404, "text/plain", "Not found", 9);

    } else if (strcmp(method, "POST") == 0) {
        char *body = strstr(request, "\r\n\r\n");
        const char *payload = body ? body + 4 : "";

        if (strcmp(path, "/send") == 0) {
            handle_send(client, payload);
        } else if (strcmp(path, "/unnamed/input") == 0) {
            handle_unnamed_input(client, payload);
        } else if (strcmp(path, "/unnamed/fork") == 0) {
            handle_unnamed_fork(client);
        } else if (strcmp(path, "/unnamed/reset") == 0) {
            handle_unnamed_reset(client);
        } else {
            send_response(client, 404, "text/plain", "Not found", 9);
        }

    } else if (strcmp(method, "OPTIONS") == 0) {
        send_response(client, 200, "text/plain", "", 0);

    } else {
        send_response(client, 404, "text/plain", "Not found", 9);
    }

    free(request);
    close(client);
    return NULL;
}

int main(int argc, char *argv[])
{
    /* If a browser disconnects mid-response, writing to that closed socket
       would normally send this whole process a SIGPIPE signal and kill it
       outright. Ignoring it means write() just returns an error instead,
       which we already handle safely. */
    signal(SIGPIPE, SIG_IGN);

    if (argc != 3 || (strcmp(argv[1], "A") != 0 && strcmp(argv[1], "B") != 0)) {
        fprintf(stderr, "Usage: %s A 5001   (or  %s B 5002)\n", argv[0], argv[0]);
        return EXIT_FAILURE;
    }

    const char *role = argv[1];
    int port = atoi(argv[2]);

    /* ---------- create both FIFOs (whichever program starts first wins) --- */
    if (mkfifo(FIFO_A_TO_B, 0666) == -1 && errno != EEXIST) { perror("mkfifo"); return 1; }
    if (mkfifo(FIFO_B_TO_A, 0666) == -1 && errno != EEXIST) { perror("mkfifo"); return 1; }

    const char *write_path, *read_path;
    if (strcmp(role, "A") == 0) {
        write_path = FIFO_A_TO_B; read_path = FIFO_B_TO_A;
        my_label = "User A"; peer_label = "User B";
    } else {
        write_path = FIFO_B_TO_A; read_path = FIFO_A_TO_B;
        my_label = "User B"; peer_label = "User A";
    }
    active_write_path = write_path;
    active_read_path = read_path;

    /* ---------- start the two background IPC threads ---------- */
    pthread_t wt, rt;
    pthread_create(&wt, NULL, writer_thread, (void *)write_path);
    pthread_create(&rt, NULL, reader_thread,  (void *)read_path);
    pthread_detach(wt);
    pthread_detach(rt);

    /* ---------- set up the listening socket ---------- */
    int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (listen_fd == -1) { perror("socket"); return 1; }

    int opt = 1;
    setsockopt(listen_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {0};
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;      /* accept connections from any IP */
    addr.sin_port        = htons((uint16_t)port);

    if (bind(listen_fd, (struct sockaddr *)&addr, sizeof(addr)) == -1) {
        perror("bind"); return 1;
    }
    if (listen(listen_fd, 16) == -1) { perror("listen"); return 1; }

    printf("=== Backend (C) running for %s ===\n", my_label);
    printf("Open the frontend at: http://localhost:%d\n", port);
    printf("Waiting for %s's backend to connect via the FIFO...\n", peer_label);

    /* ---------- accept loop: one thread per HTTP request ---------- */
    while (1) {
        int client = accept(listen_fd, NULL, NULL);
        if (client == -1) continue;

        pthread_t tid;
        pthread_create(&tid, NULL, handle_client, (void *)(intptr_t)client);
        pthread_detach(tid);
    }

    return 0;
}
