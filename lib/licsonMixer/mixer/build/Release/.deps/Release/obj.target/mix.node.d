cmd_Release/obj.target/mix.node := g++ -shared -pthread -rdynamic -m64  -Wl,-soname=mix.node -o Release/obj.target/mix.node -Wl,--start-group Release/obj.target/mix/mix.o -Wl,--end-group 
