var http = require('http');
var express = require('express');
var socket = require('socket.io');

var app = express();
var server = http.createServer(app);
var io = socket(server);

app.set("view engine", "ejs");

app.get('/', function(req, res){
   res.render("base.ejs");
});

var nicknames = {}
var rooms = {}

function winning_combo(player, board) {
    if ((board["b1"] == player && board["b2"] == player && board["b3"] == player) ||
        (board["b4"] == player && board["b5"] == player && board["b6"] == player) ||
        (board["b7"] == player && board["b8"] == player && board["b9"] == player) ||
        (board["b1"] == player && board["b4"] == player && board["b7"] == player) ||
        (board["b2"] == player && board["b5"] == player && board["b8"] == player) ||
        (board["b3"] == player && board["b6"] == player && board["b9"] == player) ||
        (board["b1"] == player && board["b5"] == player && board["b9"] == player) ||
        (board["b3"] == player && board["b5"] == player && board["b7"] == player)) {
            return true
        }
    else {
        return false
    }
}

io.on('connection', function(socket) {
    io.to(socket.id).emit("new_appearance", rooms);

    socket.on("chose_nickname", function(nick) {
        nicknames[socket.id] = nick;
    });

    socket.on("new_room", function(name) {
        var room = {dict: {"size": 0, "1": "", "2": ""},
                    board: {"b1": 0, "b2": 0, "b3": 0, "b4": 0, "b5": 0, "b6": 0, "b7": 0, "b8": 0, "b9": 0},
                    capacity: 1}
        rooms[name] = room;
        socket.join(name);
        io.to(socket.id).emit("joined_room", name);
        io.emit("new_appearance", rooms);
    })

    socket.on("joining_room", function(name) {
        socket.join(name);
        rooms[name]["capacity"] = 2;
        io.to(socket.id).emit("joined_room", name);
    })


    socket.on("made_move", function(button, id) {
        var rn = Array.from(socket.rooms)[1]
        if (rooms[rn]["dict"]["1"] == id) {
            io.to(rn).emit("display_move", button, "X");
            rooms[rn]["board"][button] = "X";
            if (winning_combo("X", rooms[rn]["board"])) {
                io.to(rooms[rn]["dict"]["1"]).emit("you_won", nicknames[rooms[rn]["dict"]["2"]]);
                io.to(rooms[rn]["dict"]["2"]).emit("you_lost", nicknames[rooms[rn]["dict"]["1"]]);
            }
            else {
                io.to(rooms[rn]["dict"]["2"]).emit("your_move", nicknames[rooms[rn]["dict"]["1"]]);
            }
        }
        else {
            io.to(rn).emit("display_move", button, "O");
            rooms[rn]["board"][button] = "O";
            if (winning_combo("O", rooms[rn]["board"])) {
                io.to(rooms[rn]["dict"]["2"]).emit("you_won", nicknames[rooms[rn]["dict"]["1"]]);
                io.to(rooms[rn]["dict"]["1"]).emit("you_lost", nicknames[rooms[rn]["dict"]["2"]]);
            }
            else {
                io.to(rooms[rn]["dict"]["1"]).emit("your_move", nicknames[rooms[rn]["dict"]["2"]]);
            }
        }
        })
    socket.on("wants-to-start", function(id) {
        var rn = Array.from(socket.rooms)[1]
        socket.broadcast.to(rn).emit("other_is_waiting", nicknames[id]);
        if (rooms[rn]["dict"]["size"] == 0) {
            rooms[rn]["dict"]["1"] = socket.id;
            rooms[rn]["dict"]["size"] += 1;
        }
        else {
            rooms[rn]["dict"]["2"] = socket.id;
            rooms[rn]["dict"]["size"] += 1
        }
        if (rooms[rn]["dict"]["size"] == 2) {
            io.to(rooms[rn]["dict"]["1"]).emit("your_move", nicknames[rooms[rn]["dict"]["2"]]);
            io.to(rooms[rn]["dict"]["2"]).emit("opponent_first", nicknames[rooms[rn]["dict"]["1"]]);
        }
    });
});

server.listen(3000);
