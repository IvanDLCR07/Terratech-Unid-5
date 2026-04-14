// Simple Tetris implementation (self-contained)
(function(){
  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 24; // size in px

  const canvas = document.getElementById('tetrisCanvas');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('nextCanvas');
  const nctx = nextCanvas.getContext('2d');

  const scoreEl = document.getElementById('tetrisScore');
  const levelEl = document.getElementById('tetrisLevel');
  const startBtn = document.getElementById('tetrisStart');
  const pauseBtn = document.getElementById('tetrisPause');
  const resetBtn = document.getElementById('tetrisReset');

  canvas.width = COLS * BLOCK;
  canvas.height = ROWS * BLOCK;
  nextCanvas.width = 80;
  nextCanvas.height = 80;

  const COLORS = ['#000000', '#ff6b6b', '#ffd166', '#06d6a0', '#118ab2', '#8338ec', '#ef476f', '#06aed5'];

  const SHAPES = [
    [],
    [[1,1,1,1]], // I
    [[2,2],[2,2]], // O
    [[0,3,0],[3,3,3]], // T
    [[4,0,0],[4,4,4]], // J
    [[0,0,5],[5,5,5]], // L
    [[6,6,0],[0,6,6]], // S
    [[0,7,7],[7,7,0]]  // Z
  ];

  function createMatrix(w,h){
    const m = [];
    while(h--) m.push(new Array(w).fill(0));
    return m;
  }

  let arena = createMatrix(COLS, ROWS);

  function collide(arena, player){
    const [m, o] = [player.matrix, player.pos];
    for(let y=0;y<m.length;y++){
      for(let x=0;x<m[y].length;x++){
        if(m[y][x] && (arena[y+o.y] && arena[y+o.y][x+o.x]) !== 0){
          return true;
        }
      }
    }
    return false;
  }

  function merge(arena, player){
    player.matrix.forEach((row, y)=>{
      row.forEach((value, x)=>{
        if(value) arena[y + player.pos.y][x + player.pos.x] = value;
      });
    });
  }

  // Rotate a matrix (works for non-square matrices) and return a new rotated matrix
  function rotate(matrix, dir){
    const h = matrix.length;
    const w = matrix[0].length;
    const res = [];
    for (let x = 0; x < w; x++) {
      res[x] = new Array(h).fill(0);
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (dir > 0) {
          // clockwise
          res[x][h - 1 - y] = matrix[y][x];
        } else {
          // counter-clockwise
          res[w - 1 - x][y] = matrix[y][x];
        }
      }
    }
    return res;
  }

  function sweep(){
    let rowCount = 0;
    outer: for(let y=arena.length-1;y>=0;y--){
      for(let x=0;x<arena[y].length;x++){
        if(arena[y][x] === 0) continue outer;
      }
      const row = arena.splice(y,1)[0].fill(0);
      arena.unshift(row);
      y++;
      rowCount++;
    }
    if(rowCount>0){
      player.score += (rowCount * 100) * rowCount;
      player.lines += rowCount;
      scoreEl.textContent = player.score;
      const newLevel = Math.floor(player.lines / 10) + 1;
      if(newLevel !== player.level){ player.level = newLevel; levelEl.textContent = player.level; updateDropInterval(); }
    }
  }

  function drawMatrix(matrix, offset, context, scale=BLOCK){
    matrix.forEach((row,y)=>{
      row.forEach((value,x)=>{
        if(value){
          context.fillStyle = COLORS[value] || '#ccc';
          context.fillRect((x+offset.x)*scale, (y+offset.y)*scale, scale-1, scale-1);
        }
      });
    });
  }

  function draw(){
    ctx.fillStyle = '#07121a';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    drawMatrix(arena, {x:0,y:0}, ctx);
    drawMatrix(player.matrix, player.pos, ctx);
  }

  function drawNext(){
    nctx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
    const scale = 20;
    const m = player.next;
    const offset = { x:1, y:1 };
    drawMatrix(m, offset, nctx, scale);
  }

  function playerReset(){
    const id = Math.floor(Math.random()*(SHAPES.length-1))+1;
    player.matrix = SHAPES[id].map(r=>r.slice());
    player.pos.y = 0;
    player.pos.x = Math.floor((COLS - player.matrix[0].length)/2);
    player.next = SHAPES[Math.floor(Math.random()*(SHAPES.length-1))+1].map(r=>r.slice());
    if(collide(arena, player)){
      arena.forEach(row=>row.fill(0));
      player.score = 0; player.lines = 0; player.level = 1;
      scoreEl.textContent = player.score; levelEl.textContent = player.level;
      clearInterval(dropIntervalId);
      updateDropInterval();
    }
    drawNext();
  }

  function playerDrop(){
    player.pos.y++;
    if(collide(arena, player)){
      player.pos.y--;
      merge(arena, player);
      sweep();
      playerResetFromNext();
    }
    dropCounter = 0;
  }

  function playerResetFromNext(){
    player.matrix = player.next.map(r=>r.slice());
    player.pos.y = 0;
    player.pos.x = Math.floor((COLS - player.matrix[0].length)/2);
    player.next = SHAPES[Math.floor(Math.random()*(SHAPES.length-1))+1].map(r=>r.slice());
    if(collide(arena, player)){
      // Game over: clear arena
      arena.forEach(row=>row.fill(0));
    }
    drawNext();
  }

  function playerMove(dir){
    player.pos.x += dir;
    if(collide(arena, player)) player.pos.x -= dir;
  }

  let dropCounter = 0;
  let dropInterval = 1000;
  let lastTime = 0;
  let dropIntervalId = null;

  function updateDropInterval(){
    dropInterval = Math.max(120, 1000 - (player.level-1)*100);
    if(dropIntervalId) {
      clearInterval(dropIntervalId);
      dropIntervalId = setInterval(() => { playerDrop(); draw(); }, dropInterval);
    }
  }

  function update(time=0){
    draw();
  }

  function rotatePlayer(dir){
    const old = player.matrix;
    const rotated = rotate(old, dir);
    player.matrix = rotated;
    if(collide(arena, player)){
      player.matrix = old;
    }
  }

  // Player state
  const player = { pos: {x:0,y:0}, matrix: null, next: null, score:0, lines:0, level:1 };

  // Controls bound to the canvas (canvas must be focused to receive keys)
  canvas.tabIndex = canvas.tabIndex || 0;
  canvas.addEventListener('click', () => canvas.focus());
  canvas.addEventListener('keydown', (e) => {
    const key = e.key;
    if(['ArrowLeft','a','A'].includes(key)) { e.preventDefault(); playerMove(-1); }
    else if(['ArrowRight','d','D'].includes(key)) { e.preventDefault(); playerMove(1); }
    else if(['ArrowDown','s','S'].includes(key)) { e.preventDefault(); playerDrop(); }
    else if(key === ' '){ // hard drop
      e.preventDefault();
      while(!collide(arena, player)) player.pos.y++;
      player.pos.y--;
      merge(arena, player);
      sweep();
      playerResetFromNext();
    }
    else if(['ArrowUp','w','W'].includes(key)) { e.preventDefault(); rotatePlayer(1); }
    draw();
  });

  // Prevent page scroll while the game is actively running
  window.addEventListener('keydown', (e) => {
    if (dropIntervalId && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) {
      e.preventDefault();
    }
  }, { passive: false });

  startBtn.addEventListener('click', ()=>{
    if(dropIntervalId) return; // already running
    dropIntervalId = setInterval(()=>{ playerDrop(); draw(); }, dropInterval);
    startBtn.textContent = 'Jugando...';
    pauseBtn.disabled = false;
  });

  pauseBtn.addEventListener('click', ()=>{
    if(dropIntervalId){ clearInterval(dropIntervalId); dropIntervalId = null; pauseBtn.textContent = 'Reanudar'; }
    else { dropIntervalId = setInterval(()=>{ playerDrop(); draw(); }, dropInterval); pauseBtn.textContent = 'Pausar'; }
  });

  resetBtn.addEventListener('click', ()=>{
    arena = createMatrix(COLS, ROWS);
    player.score = 0; player.lines = 0; player.level = 1;
    scoreEl.textContent = player.score; levelEl.textContent = player.level;
    clearInterval(dropIntervalId); dropIntervalId = null; startBtn.textContent = 'Iniciar'; pauseBtn.textContent = 'Pausar';
    playerReset(); draw();
  });

  // Init
  playerReset();
  draw();
})();
