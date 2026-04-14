// Asteroids Game - EcoDefender: Protegiendo el Espacio Sustentable
(function(){
  const canvas = document.getElementById('asteroidsCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('asteroidsScore');
  const livesEl = document.getElementById('asteroidsLives');
  const levelEl = document.getElementById('asteroidsLevel');
  const startBtn = document.getElementById('asteroidsStart');
  const pauseBtn = document.getElementById('asteroidsPause');
  const resetBtn = document.getElementById('asteroidsReset');
  const countdownEl = document.getElementById('asteroidsCountdown');

  canvas.width = 600;
  canvas.height = 400;

  // Game state
  let gameRunning = false;
  let gamePaused = false;
  let countdownActive = false;
  let countdownInterval = null;
  let score = 0;
  let lives = 3;
  let level = 1;
  let asteroids = [];
  let bullets = [];
  let particles = [];
  let keys = {};

  // Ship properties
  const ship = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    angle: 0,
    vx: 0,
    vy: 0,
    radius: 8,
    thrust: 0.2,
    friction: 0.98,
    rotationSpeed: 0.15
  };

  // Asteroid class
  class Asteroid {
    constructor(x, y, size, vx, vy) {
      this.x = x;
      this.y = y;
      this.size = size;
      this.vx = vx;
      this.vy = vy;
      this.radius = size * 5;
      this.rotation = 0;
      this.rotationSpeed = (Math.random() - 0.5) * 0.1;
      this.vertices = this.generateVertices();
    }

    generateVertices() {
      const vertices = [];
      const numVertices = 8 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numVertices; i++) {
        const angle = (i / numVertices) * Math.PI * 2;
        const radius = this.radius * (0.7 + Math.random() * 0.6);
        vertices.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        });
      }
      return vertices;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.rotation += this.rotationSpeed;

      // Wrap around screen
      if (this.x < -this.radius) this.x = canvas.width + this.radius;
      if (this.x > canvas.width + this.radius) this.x = -this.radius;
      if (this.y < -this.radius) this.y = canvas.height + this.radius;
      if (this.y > canvas.height + this.radius) this.y = -this.radius;
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      ctx.strokeStyle = '#a7c957';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
      for (let i = 1; i < this.vertices.length; i++) {
        ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    }
  }

  // Bullet class
  class Bullet {
    constructor(x, y, vx, vy) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.radius = 2;
      this.lifetime = 60; // frames
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.lifetime--;

      // Remove if off screen
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
        this.lifetime = 0;
      }
    }

    draw() {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Particle class for explosions
  class Particle {
    constructor(x, y, vx, vy, color, lifetime) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.lifetime = lifetime;
      this.maxLifetime = lifetime;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.lifetime--;
      this.vx *= 0.98;
      this.vy *= 0.98;
    }

    draw() {
      const alpha = this.lifetime / this.maxLifetime;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, 2, 2);
      ctx.globalAlpha = 1;
    }
  }

  // Initialize asteroids for current level
  function initAsteroids() {
    asteroids = [];
    const numAsteroids = 4 + level * 2;

    for (let i = 0; i < numAsteroids; i++) {
      let x, y;
      do {
        x = Math.random() * canvas.width;
        y = Math.random() * canvas.height;
      } while (Math.abs(x - ship.x) < 100 && Math.abs(y - ship.y) < 100);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      asteroids.push(new Asteroid(x, y, 3, vx, vy));
    }
  }

  // Reset ship position
  function resetShip() {
    ship.x = canvas.width / 2;
    ship.y = canvas.height / 2;
    ship.angle = 0;
    ship.vx = 0;
    ship.vy = 0;
  }

  // Create explosion particles
  function createExplosion(x, y, color = '#ff6b6b') {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      particles.push(new Particle(x, y, vx, vy, color, 30));
    }
  }

  // Check collision between two circles
  function checkCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (obj1.radius + obj2.radius);
  }

  // Update game state
  function update() {
    if (!gameRunning || gamePaused) return;

    // Update ship
    if (keys.ArrowLeft || keys.KeyA) {
      ship.angle -= ship.rotationSpeed;
    }
    if (keys.ArrowRight || keys.KeyD) {
      ship.angle += ship.rotationSpeed;
    }
    if (keys.ArrowUp || keys.KeyW) {
      ship.vx += Math.cos(ship.angle) * ship.thrust;
      ship.vy += Math.sin(ship.angle) * ship.thrust;
    }

    // Apply friction
    ship.vx *= ship.friction;
    ship.vy *= ship.friction;

    // Update position
    ship.x += ship.vx;
    ship.y += ship.vy;

    // Wrap around screen
    if (ship.x < 0) ship.x = canvas.width;
    if (ship.x > canvas.width) ship.x = 0;
    if (ship.y < 0) ship.y = canvas.height;
    if (ship.y > canvas.height) ship.y = 0;

    // Update bullets
    bullets = bullets.filter(bullet => {
      bullet.update();
      return bullet.lifetime > 0;
    });

    // Update asteroids
    asteroids.forEach(asteroid => asteroid.update());

    // Update particles
    particles = particles.filter(particle => {
      particle.update();
      return particle.lifetime > 0;
    });

    // Check bullet-asteroid collisions
    bullets.forEach((bullet, bulletIndex) => {
      asteroids.forEach((asteroid, asteroidIndex) => {
        if (checkCollision(bullet, asteroid)) {
          // Remove bullet and asteroid
          bullets.splice(bulletIndex, 1);
          asteroids.splice(asteroidIndex, 1);

          // Create explosion
          createExplosion(asteroid.x, asteroid.y, '#a7c957');

          // Add score
          score += asteroid.size * 20;

          // Create smaller asteroids if size > 1
          if (asteroid.size > 1) {
            for (let i = 0; i < 2; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 2 + Math.random() * 2;
              const vx = Math.cos(angle) * speed;
              const vy = Math.sin(angle) * speed;
              asteroids.push(new Asteroid(asteroid.x, asteroid.y, asteroid.size - 1, vx, vy));
            }
          }
        }
      });
    });

    // Check ship-asteroid collisions
    asteroids.forEach(asteroid => {
      if (checkCollision(ship, asteroid)) {
        lives--;
        createExplosion(ship.x, ship.y, '#ff6b6b');
        resetShip();

        if (lives <= 0) {
          gameRunning = false;
          alert(`¡Juego terminado! Puntuación final: ${score}`);
        }
      }
    });

    // Check if level is complete
    if (asteroids.length === 0) {
      level++;
      initAsteroids();
    }

    // Update UI
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    levelEl.textContent = level;
  }

  // Draw game
  function draw() {
    // Clear canvas
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
      const x = (i * 37) % canvas.width;
      const y = (i * 23) % canvas.height;
      ctx.fillRect(x, y, 1, 1);
    }

    if (gameRunning) {
      // Draw ship
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);

      ctx.strokeStyle = '#90e0ef';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ship.radius, 0);
      ctx.lineTo(-ship.radius * 0.7, -ship.radius * 0.7);
      ctx.lineTo(-ship.radius * 0.3, 0);
      ctx.lineTo(-ship.radius * 0.7, ship.radius * 0.7);
      ctx.closePath();
      ctx.stroke();

      // Draw thrust flame if accelerating
      if (keys.ArrowUp || keys.KeyW) {
        ctx.strokeStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.moveTo(-ship.radius * 0.3, -ship.radius * 0.3);
        ctx.lineTo(-ship.radius * 1.2, 0);
        ctx.lineTo(-ship.radius * 0.3, ship.radius * 0.3);
        ctx.stroke();
      }

      ctx.restore();

      // Draw bullets
      bullets.forEach(bullet => bullet.draw());

      // Draw asteroids
      asteroids.forEach(asteroid => asteroid.draw());

      // Draw particles
      particles.forEach(particle => particle.draw());
    } else {
      // Draw title screen
      ctx.fillStyle = '#90e0ef';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🚀 EcoDefender', canvas.width / 2, canvas.height / 2 - 50);
      ctx.font = '16px Arial';
      ctx.fillText('Protege el espacio sustentable', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillText('Presiona START para comenzar', canvas.width / 2, canvas.height / 2 + 20);
    }
  }

  // Game loop
  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Event listeners
  document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (e.code === 'Space' && gameRunning && !gamePaused) {
      e.preventDefault();
      // Shoot bullet
      const bulletSpeed = 8;
      const vx = Math.cos(ship.angle) * bulletSpeed;
      const vy = Math.sin(ship.angle) * bulletSpeed;
      bullets.push(new Bullet(ship.x, ship.y, vx, vy));
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  function showCountdown(value) {
    countdownEl.textContent = value;
    countdownEl.classList.add('show');
  }

  function hideCountdown() {
    countdownEl.classList.remove('show');
  }

  function startCountdown() {
    let count = 3;
    countdownActive = true;
    showCountdown(count);

    countdownInterval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        showCountdown(count);
      } else {
        countdownEl.textContent = '¡YA!';
        clearInterval(countdownInterval);
        setTimeout(() => {
          hideCountdown();
          countdownActive = false;
          gameRunning = true;
          gamePaused = false;
        }, 800);
      }
    }, 1000);
  }

  function resetCountdown() {
    countdownActive = false;
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    hideCountdown();
  }

  startBtn.addEventListener('click', () => {
    if (!gameRunning && !countdownActive) {
      gamePaused = false;
      score = 0;
      lives = 3;
      level = 1;
      resetShip();
      initAsteroids();
      bullets = [];
      particles = [];
      resetCountdown();
      startCountdown();
    }
  });

  pauseBtn.addEventListener('click', () => {
    if (gameRunning) {
      gamePaused = !gamePaused;
      pauseBtn.textContent = gamePaused ? 'Reanudar' : 'Pausar';
    }
  });

  resetBtn.addEventListener('click', () => {
    gameRunning = false;
    gamePaused = false;
    score = 0;
    lives = 3;
    level = 1;
    resetShip();
    asteroids = [];
    bullets = [];
    particles = [];
    resetCountdown();
    pauseBtn.textContent = 'Pausar';
  });

  // Start game loop
  gameLoop();
})();
