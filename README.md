# sprotobuf
a new protobuf

# how to use
```js
const sprotobuf = require("../lib")
const op = require("buffer-op")

const root = sprotobuf.load("./example/rpc.proto")

let obj = {
    int_val: 1,
    string_val: "123",
    bool_val: false,
    double_val: 1.2345,
    int_vals: [1, 2, 3],
    map_val: new Map([["123", 123], ["234", 234], ["4234", 4234]])
}

let stream = new op.Stream()
let writer = new op.Writer(stream)
let reader = new op.Reader(stream)

sprotobuf.to_msg(root, writer, "example_test", obj)
sprotobuf.to_rpc(root, writer, "example.echo", "123")

let resp = sprotobuf.from_msg(root, reader, "example_test")
let rpc = sprotobuf.from_rpc(root, reader)

console.dir(resp)
console.dir(rpc)
```

# proto
```
message example_test
{
    int32 int_val = 1
    string string_val = 2
    bool bool_val = 3
    double double_val = 4
    [int32] int_vals = 5
    <string,int32> map_val = 6
}
message error
{
    int32 code = 1
    string reason = 2
}
message call
{
    uint32 service = 1
    uint32 method = 2
    uint32 session = 3
    bytes req = 4
}
message response
{
    uint32 session = 1

    error err = 2
    bytes resp = 3
    
}
message invoke
{
    uint32 service = 1  //line comment
    uint32 method = 2 //line comment
    bytes req = 3
}
message net_data        /* block comments */
{
    call ca = 1
    invoke inv = 2
    response resp = 3
}

/*
this
is
a
block 
comment
*/
service example
{
    rpc test () return (bool){}
    rpc echo(string) return(string){}
}
service chat
{
    rpc speak(string) return(bool){}
}

```
