// imports for server
const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET']
  }
})

// allows running phaser on nodejs
require('@geckos.io/phaser-on-nodejs')

const { SnapshotInterpolation } = require('@geckos.io/snapshot-interpolation')
const SI = new SnapshotInterpolation()
const Phaser = require('phaser')


class Player extends Phaser.Physics.Arcade.Image {
  constructor (scene, x, y) {
    super(scene, x, y, '')

    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setCollideWorldBounds(true)
  }
}


class ServerScene extends Phaser.Scene {
  constructor () {
    super()
    this.tick = 0
    this.players = new Map()
  }

  create () {
    this.physics.world.setBounds(0, 0, 1280, 720)

    io.on('connection', socket => {
      const x = Math.random() * 1200 + 40
      const player = new Player(this, x, 200)

      this.players.set(socket.id, {
        socket,
        player
      })

      socket.on('movement', movement => {
        const { left, right, up, down } = movement
        const speed = 160

        if (left) player.setVelocityX(-speed)
        else if (right) player.setVelocityX(speed)
        else player.setVelocityX(0)

        if (up) player.setVelocityY(-speed)
        else if (down) player.setVelocityY(speed)
        else player.setVelocityY(0)
      })

      socket.on('disconnect', reason => {
        const player = this.players.get(socket.id)
        player.player.destroy()
        this.players.delete(socket.id)
      })
    })
  }

  update () {
    this.tick++

    // only send the update to the client at 30 FPS (save bandwidth)
    if (this.tick % 2 !== 0) return

    // get an array of all players
    const players = []
    this.players.forEach(p => {
      const { socket, player } = p
      players.push({ id: socket.id, x: player.x, y: player.y })
    })

    const snapshot = SI.snapshot.create(players)

    // send all players to all players
    this.players.forEach(player => {
      const { socket } = player
      socket.emit('snapshot', snapshot)
    })
  }
}

const config = {
  type: Phaser.HEADLESS,
  width: 1280,
  height: 720,
  banner: false,
  audio: false,
  scene: [ServerScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }
    }
  }
}

new Phaser.Game(config)

console.log('game server listening for incoming socket connections on ws://localhost:3000')
server.listen(3000)
