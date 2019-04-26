const path = require('path');
// const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
    mode: "production",
    entry: './src/browser.js',
    output: {
        filename: 'sprotobuf.min.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'sprotobuf',
        libraryTarget: "umd",
    },
    devtool: 'source-map',
    // plugins: [
    //     new UglifyJsPlugin({
    //         sourceMap: true
    //     })
    // ],
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader'
                },
                // exclude: '/node_modules/'
            }
        ]
    },
};