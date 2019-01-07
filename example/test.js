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