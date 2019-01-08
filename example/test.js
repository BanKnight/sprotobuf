const sprotobuf = require("../lib")
const op = require("buffer-op")

const root = sprotobuf.load("./example/rpc.proto")

let obj = {
    int_val: 1,
    string_val: "123",
    bool_val: false,
    double_val: 1.2345,
    int_vals: [1, 2, 3],
    map_val: new Map([["123", 123], ["234", 234], ["4234", 4234]]),
    nesteds: [{ test: 1 }, { test: 2 }]
}

let stream = new op.Stream()
let writer = new op.Writer(stream)
let reader = new op.Reader(stream)

sprotobuf.to_msg(root, writer, "example_test", obj)
sprotobuf.to_rpc(root, writer, "example.echo", { a: "123" })
sprotobuf.to_resp(root, writer, "example.echo", { test: "a", abc: "c" })

let request = sprotobuf.from_msg(root, reader, "example_test")
let rpc = sprotobuf.from_rpc(root, reader)
let resp = sprotobuf.from_resp(root, reader, "example.echo")

console.dir(request)
console.dir(rpc)
console.dir(resp)