// src/components/PhaserGame.tsx
import { useEffect, useRef } from 'react'
import { Game } from 'phaser'
import { MainScene } from '../scenes/MainScene'

interface PhaserGameProps {
  onGameCreated?: (game: Phaser.Game) => void
}

export const PhaserGame: React.FC<PhaserGameProps> = ({ onGameCreated }) => {
  const gameRef = useRef<HTMLDivElement>(null)
  const gameInstance = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (gameRef.current && !gameInstance.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0, x: 0 },
            debug: import.meta.env.DEV // debug только в development
          }
        },
        scene: [MainScene],
        parent: gameRef.current,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: '100%',
          height: '100%'
        },
        render: {
          antialias: false,
          pixelArt: false
        }
      }

      gameInstance.current = new Game(config)
      
      if (onGameCreated) {
        onGameCreated(gameInstance.current)
      }

      // Обработчик изменения размера окна
      const handleResize = () => {
        if (gameInstance.current) {
          gameInstance.current.scale.resize(window.innerWidth, window.innerHeight)
        }
      }

      window.addEventListener('resize', handleResize)
      
      // Очистка обработчика при размонтировании
      return () => {
        window.removeEventListener('resize', handleResize)
        if (gameInstance.current) {
          gameInstance.current.destroy(true)
          gameInstance.current = null
        }
      }
    }
  }, [onGameCreated])

  return (
    <div 
      ref={gameRef} 
      style={{ 
        width: '100vw', 
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden'
      }} 
    />
  )
}