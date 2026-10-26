# Makefile for Copy-on-Write (COW) Memory Demonstrator
# Operating Systems and System Programming (OSSP)

CC ?= gcc
CFLAGS ?= -Wall -Wextra -O2 -pedantic -std=c99
TARGET = copy_on_write
SRC = copy_on_write.c

.PHONY: all clean run

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) $(SRC) -o $(TARGET)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)
