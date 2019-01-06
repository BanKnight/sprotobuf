const proto = `
message example_test
{
    int32 int_val = 1
    string string_val = 2
    bool bool_val = 3
    double double_val = 4
    [int32] int_vals = 5
    <string,int32> map_val = 6
}
`
const sprotobuf = require("../lib")
const op = require("buffer-op")

const root = sprotobuf.parse(proto)

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

sprotobuf.to_buf(root, writer, "example_test", obj)

let resp = sprotobuf.from_buf(root, reader, "example_test")

console.dir(resp, 10)