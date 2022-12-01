const { SnapshotInterpolation } = Snap
const SI = new SnapshotInterpolation(45) // 30 FPS

class Scene extends Phaser.Scene {
  constructor () {
    super()
    this.players = new Map()
    this.socket = io()
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
    type: Phaser.CANVAS,
    parent: 'multiplayer-void-parent',
    canvas: document.getElementById('the-multiplayer-void'),
    scale: {
      mode: Phaser.Scale.FIT,
      height: 720,
      width: 1280,
    },
    scene: [Scene]
}

window.addEventListener('load', () => {
  const game = new Phaser.Game(config)
})
