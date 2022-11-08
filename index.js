const server = require('http').createServer()
const io = require('socket.io')(server, {
  cors: {
    origin: '*', // set to your domain
    methods: ['GET']
  }
})

// enables running phaser games on nodejs
require('@geckos.io/phaser-on-nodejs')

// initialize Snapshot Interpolation
// enables sending current game state and entity positions to clients at a fixed tick rate
const { SnapshotInterpolation } = require('@geckos.io/snapshot-interpolation')
const SI = new SnapshotInterpolation()
const Phaser = require('phaser')

// player is a Phaser Arcade Physics Sprite with an Arcade Physics body and related components
class Player extends Phaser.Physics.Arcade.Image {
  constructor (scene, x, y) {
    super(scene, x, y, '')
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.setCollideWorldBounds(true)
  }
}

// game instances are created and controlled server-side
class ServerScene extends Phaser.Scene {
  constructor () {
    super()
    this.tick = 0
    this.players = new Map()
  }

  // game setup
  create () {
    // set movable world bounds
    this.physics.world.setBounds(0, 0, 1280, 720)

    // when there is an incoming socket connection
    io.on('connection', socket => {
      // create random player x spawning position
      const x = Math.random() * 1200 + 40
      // create player
      const player = new Player(this, x, 200)
      // add to list of players
      this.players.set(socket.id, {
        socket,
        player
      })

      // upon receiving a movement message from client
      socket.on('movement', movement => {
        // set movement speed of players
        const speed = 240
        // get input directions present in movement message
        const { left, right, up, down } = movement
        // set player velocity according to movement input
        if (left) player.setVelocityX(-speed)
        else if (right) player.setVelocityX(speed)
        else player.setVelocityX(0)
        if (up) player.setVelocityY(-speed)
        else if (down) player.setVelocityY(speed)
        else player.setVelocityY(0)
      })

      // upon receiving player disconnect message
      socket.on('disconnect', () => {
        const player = this.players.get(socket.id)
        player.player.destroy()
        // destroy the Player instance clearing resources
        // broadcast players list to every player
        this.players.delete(socket.id)
      })
    })
  }

  update () {
    this.tick++
    // only send the update to the client at 15 FPS (save bandwidth)
    if (this.tick % 2 !== 0) return

    // create snapshot of players and their positions (game state)
    const players = []
    this.players.forEach(p => {
      const { socket, player } = p
      players.push({ id: socket.id, x: player.x, y: player.y })
    })
    const snapshot = SI.snapshot.create(players)

    // emit the snapshot to each connected client
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
