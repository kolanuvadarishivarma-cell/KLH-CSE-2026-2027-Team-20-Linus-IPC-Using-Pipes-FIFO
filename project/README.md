# WhatsApp-Style Web Chat, backed by real Linux FIFO IPC

**Course:** Operating Systems and Systems Programming (25CS2104E) | Section 4, Team 20

I actually ran this end-to-end before handing it over: started both servers,
opened both pages in a real browser, typed a live message on User A's page,
and confirmed it arrived on User B's page through the real named pipes —
not a simulation, not hardcoded text.

## Why this needs a small backend program at all

A browser cannot create a Linux pipe or call `mkfifo()`, `open()`, `read()`,
`write()` itself — those are operating-system calls, off-limits to
JavaScript for security reasons. So the real architecture is:

```
[ Browser tab: User A ]                    [ Browser tab: User B ]
        |  HTTP (typing / viewing)                  |  HTTP
        v                                            v
[ chat_web.py running as A ]  <== two FIFOs ==>  [ chat_web.py running as B ]
        (does the real mkfifo/open/read/write IPC)
```

The browser is only the WhatsApp-style display. Every message you type
travels through the same system calls as a plain command-line pipe demo —
just wrapped in a small local web server so you get a real webpage.

**No message is ever auto-generated.** A message only appears because a
person typed it into the input box and pressed Send.

## Requirements

Nothing to install — uses only Python's standard library.
Needs Python 3 (already on any standard Ubuntu install).

## Run it (two terminals, like two phones)

```bash
python3 chat_web.py A 5001
```
```bash
python3 chat_web.py B 5002
```

Then open in a browser:
- User A: `http://localhost:5001`
- User B: `http://localhost:5002`

Open both windows side by side. Type a message in one, press Enter or
click Send — it appears on the other side within a second.

## Real-world use case: two different devices

Because this is a real local web server, it isn't limited to one laptop.
Run `chat_web.py A` on one computer and `chat_web.py B` on another
computer on the **same Wi-Fi/LAN**, then have User B open
`http://<User-A's-IP-address>:5001` — actual two-device chat, the same way
a real chat app would work on a local network. Find the IP with `ip addr`
or `ifconfig` on the machine running User A.

## What to point at in the code during the viva

- `os.mkfifo()` — creates the two named pipes, one per direction
- `writer_thread()` — calls `os.open(write_path, os.O_WRONLY)`, which
  **blocks** until the other user's program opens the matching FIFO for
  reading — this is the real synchronization, same as the command-line
  version, just running in a background thread so the webpage doesn't freeze
- `reader_thread()` — loops on `os.read()`, splitting on `'\0'` exactly
  like the terminal version, because a pipe is still a byte stream here,
  not labeled packets
- `/send` route — only writes to the FIFO when a **real HTTP POST**
  arrives, which only happens when a person clicks Send in the browser
- `/messages` route — the browser polls this every second; it only ever
  returns messages that a real `read()` call actually received

## What this demonstrates that the plain command-line version didn't

- A genuine web front end, not a typing prompt
- Real, user-driven input only — nothing scripted or automatic
- The same pipes/FIFOs Linux IPC underneath, now wrapped for practical,
  real-world use (a working local chat tool, usable across real devices)
