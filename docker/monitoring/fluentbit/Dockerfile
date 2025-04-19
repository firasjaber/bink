FROM fluent/fluent-bit:latest

USER root

# Install lua and luarocks
RUN apk add --no-cache lua5.1 lua5.1-dev gcc musl-dev make

# Install luarocks
RUN wget https://luarocks.org/releases/luarocks-3.9.2.tar.gz && \
    tar zxpf luarocks-3.9.2.tar.gz && \
    cd luarocks-3.9.2 && \
    ./configure --with-lua-include=/usr/include/lua5.1 && \
    make && \
    make install && \
    cd .. && \
    rm -rf luarocks-3.9.2* && \
    luarocks install lua-cjson

USER fluent-bit