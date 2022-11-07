const { SnapshotInterpolation } = Snap
const SI = new SnapshotInterpolation(45) // 30 FPS

class Scene extends Phaser.Scene {
  constructor () {
    super()
    this.players = new Map()
    this.socket = io('ws://127.0.0.1:3000',  { transports : ['websocket'] })
  }

  preload () {
    this.load.image('player_capsule', 'assets/player_capsule.png')
  }

  create () {
    this.cursors = this.input.keyboard.createCursorKeys()
    this.socket.on('snapshot', snapshot => {
      SI.snapshot.add(snapshot)
    })
  }

  update () {
    const snap = SI.calcInterpolation('x y')
    if (!snap) return
    const { state } = snap
    if (!state) return
    state.forEach(player => {
      const exists = this.players.has(player.id)
      if (!exists) {
        const _player = this.add.image(player.x, player.y, 'player_capsule').setOrigin(0)
        this.players.set(player.id, { player: _player })
      } else {
        const _player = this.players.get(player.id).player
        _player.setX(player.x)
        _player.setY(player.y)
      }
    })
    const movement = {
      left: this.cursors.left.isDown,
      right: this.cursors.right.isDown,
      up: this.cursors.up.isDown,
      down: this.cursors.down.isDown
    }
    this.socket.emit('movement', movement)
  }
}

const config = {
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  scene: [Scene]
}

window.addEventListener('load', () => {
  const game = new Phaser.Game(config)
})
