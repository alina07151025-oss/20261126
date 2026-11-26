let bgImage; // 儲存背景圖片 bg/3.png
let bgOffsetX = 0; // 記錄背景水平捲動偏移量（負值代表背景往左移動）
let characterSprite; // 儲存角色一的精靈圖
let walkSprite; // 儲存角色一的走路精靈圖
let magicSprite; // 儲存角色一的施法精靈圖
let magicEffectSprite; // 儲存角色一的魔法特效精靈圖

let char2StopSprite; // 儲存角色二的待機精靈圖 2/stop/stop.png
let char2ActionSprite; // 儲存角色二的動作精靈圖 2/action/action.png

let characterX; // 儲存角色一目前的水平中心位置
let isWalking = false; // 記錄角色是否已切換為走路動畫
let facingDirection = 1; // 記錄角色朝向（1 為右，-1 為左）
let isCasting = false; // 記錄角色是否正在播放施法動畫
let magicStartFrame = 0; // 記錄施法動畫開始時的畫面計數
let magicDirection = 1; // 記錄施法時鎖定的方向
let spaceIsDown = false; // 記錄空白鍵是否已按住以避免重複觸發
let activeEffects = []; // 儲存目前畫面上飛行中的魔法特效

// 數學題目與特效狀態變數
let wasNearChar2 = false; // 記錄上一幀是否接近角色二
let currentQuiz = null; // 儲存目前題目 { question, options, answer, selectedIndex, isCorrect }
let optionButtons = []; // 儲存四個選項按鈕的座標與尺寸
let feedbackType = null; // 'fireworks' | 'lightning' | null
let feedbackEndTime = 0; // 特效結束時間（毫秒）
let fireworks = []; // 儲存煙火粒子
let nextFireworkTime = 0; // 下一次發射煙火的時間

const frameCountInSprite = 10; // 設定精靈圖包含的影格數
const frameWidth = 139.5; // 設定每個影格的寬度（1395 除以 10）
const frameHeight = 196; // 設定每個影格的高度
const walkFrameCount = 9; // 設定走路精靈圖包含的影格數
const walkFrameWidth = 1246 / walkFrameCount; // 計算走路動畫每格的寬度
const walkFrameHeight = 198; // 設定走路動畫每格的高度
const magicFrameCount = 4; // 設定施法精靈圖包含的影格數
const magicFrameWidth = 1039 / magicFrameCount; // 計算施法動畫每格的寬度
const magicFrameHeight = 146; // 設定施法動畫每格的高度
const effectFrameCount = 5; // 設定魔法特效精靈圖包含的影格數
const effectFrameWidth = 740 / effectFrameCount; // 計算魔法特效每格的寬度
const effectFrameHeight = 19; // 設定魔法特效每格的高度

// 角色二精靈圖參數
const char2StopFrameCount = 8; // 2/stop/stop.png 共 8 張
const char2StopTotalWidth = 699; // 2/stop/stop.png 全寬 699
const char2StopFrameWidth = char2StopTotalWidth / char2StopFrameCount;
const char2StopFrameHeight = 190; // 2/stop/stop.png 高 190

const char2ActionFrameCount = 14; // 2/action/action.png 共 14 張
const char2ActionTotalWidth = 1871; // 2/action/action.png 全寬 1871
const char2ActionFrameWidth = char2ActionTotalWidth / char2ActionFrameCount;
const char2ActionFrameHeight = 177; // 2/action/action.png 高 177

const framesPerStep = 8; // 設定動畫每隔幾個畫面更新一格

function preload() { // 在畫布建立前載入圖片資源
  bgImage = loadImage("bg/3.png"); // 載入背景圖片 bg/3.png
  characterSprite = loadImage("1/stop/stop.png"); // 載入角色一的十格精靈圖
  walkSprite = loadImage("1/walk/walk.png"); // 載入角色一的九格走路精靈圖
  magicSprite = loadImage("1/magic/magic.png"); // 載入角色一的四格施法精靈圖
  magicEffectSprite = loadImage("1/magic_effect/magic_effect.png"); // 載入五格魔法特效精靈圖

  char2StopSprite = loadImage("2/stop/stop.png"); // 載入角色二待機精靈圖
  char2ActionSprite = loadImage("2/action/action.png"); // 載入角色二動作精靈圖
}

function setup() { // 初始化畫布與繪圖模式
  createCanvas(windowWidth, windowHeight); // 建立符合視窗尺寸的畫布
  imageMode(CENTER); // 讓座標代表影格的中心點
  characterX = (width * 2) / 3; // 將角色一初始位置設在畫布寬度的三分之二處
  frameRate(60); // 將動畫更新速率設定為每秒六十格
  generateMathQuestion(); // 預先產生一題數學加法選擇題
}

// 產生隨機數學加法選擇題
function generateMathQuestion() {
  const num1 = floor(random(1, 50));
  const num2 = floor(random(1, 50));
  const answer = num1 + num2;

  const optionSet = new Set([answer]);
  while (optionSet.size < 4) {
    const offset = floor(random(-12, 13));
    const candidate = answer + offset;
    if (candidate > 0 && candidate !== answer) {
      optionSet.add(candidate);
    }
  }

  const options = shuffle(Array.from(optionSet));
  currentQuiz = {
    question: `${num1} + ${num2} = ?`,
    options: options,
    answer: answer,
    selectedIndex: -1,
    isCorrect: null
  };
}

function draw() { // 每個畫面更新一次背景與角色
  background("#87CEEB"); // 預設底色避免圖片載入前空白

  // 計算單張背景圖片依畫布高度等比例縮放後的寬度（確保至少與畫布同寬以完整覆蓋畫面）
  const bgAspect = bgImage && bgImage.height > 0 ? bgImage.width / bgImage.height : 1;
  const singleBgWidth = max(width, height * bgAspect);
  const singleBgHeight = height;

  // 計算三張背景串接後的可捲動範圍
  const minBgOffset = width - singleBgWidth * 2;
  const maxBgOffset = singleBgWidth;
  const anchorX = (width * 2) / 3; // 角色在捲動模式下的基準水平位置

  const movingRight = keyIsDown(RIGHT_ARROW); // 檢查右方向鍵目前是否按住
  const movingLeft = keyIsDown(LEFT_ARROW); // 檢查左方向鍵目前是否按住
  isWalking = movingRight || movingLeft; // 沒有按住左右鍵時切回站立動畫
  const movementStep = constrain(width * 0.004, 2, 8); // 依畫布寬度計算適合不同裝置的移動速度

  // 維持角色一高度為畫布高度的 1/3，寬度依原圖寬高比等比例縮放
  const characterScale = (height / 3) / frameHeight;
  const characterWidth = frameWidth * characterScale; // 計算角色一基本顯示寬度
  const characterHeight = height / 3;

  if (movingRight) { // 按住右方向鍵
    isWalking = true; // 切換至走路動畫
    facingDirection = 1; // 設定角色朝向右方
    if (characterX < anchorX) {
      characterX = min(anchorX, characterX + movementStep);
    } else if (bgOffsetX > minBgOffset) {
      bgOffsetX = max(minBgOffset, bgOffsetX - movementStep);
    } else {
      characterX += movementStep; // 讓角色向右移動
    }
  } else if (movingLeft) { // 按住左方向鍵
    isWalking = true; // 切換至走路動畫
    facingDirection = -1; // 設定角色朝向左方
    if (characterX > anchorX) {
      characterX = max(anchorX, characterX - movementStep);
    } else if (bgOffsetX < maxBgOffset) {
      bgOffsetX = min(maxBgOffset, bgOffsetX + movementStep);
    } else {
      characterX -= movementStep; // 讓角色向左移動
    }
  }

  // 限制角色一中心避免超出畫布左右邊界
  characterX = constrain(characterX, characterWidth / 2, width - characterWidth / 2);

  // 繪製三張左右串接的背景圖片（i = -1 為最左端背景，i = 0 為中間，i = 1 為最右端）
  if (bgImage) {
    push();
    imageMode(CORNER); // 背景使用左上角座標對齊無縫串接
    for (let i = -1; i <= 1; i++) {
      const drawX = bgOffsetX + i * singleBgWidth;
      image(bgImage, drawX, 0, singleBgWidth, singleBgHeight);
    }
    pop();
  }

  // 計算角色二位置：位於最左端背景圖（i = -1）的中間，並確保不超出畫面左右邊界
  const leftMostBgCenterX = bgOffsetX - singleBgWidth * 0.5;
  const char2Scale = (height / 3) / char2StopFrameHeight;
  const char2DefaultWidth = char2StopFrameWidth * char2Scale;
  const char2X = constrain(leftMostBgCenterX, char2DefaultWidth / 2, width - char2DefaultWidth / 2);

  // 判斷角色一是否接近角色二
  const distanceToChar2 = abs(characterX - char2X);
  const proximityThreshold = max(140, (characterWidth + char2DefaultWidth) * 0.9);
  const isChar2Active = distanceToChar2 <= proximityThreshold;

  // 剛靠近角色二時重新產生題目
  if (isChar2Active && !wasNearChar2) {
    generateMathQuestion();
  }
  wasNearChar2 = isChar2Active;

  // 當角色一在角色二左邊時，角色二朝左（-1）；否則朝右（1）
  const char2Facing = characterX < char2X ? -1 : 1;

  // 繪製角色二
  const char2Sprite = isChar2Active ? char2ActionSprite : char2StopSprite;
  const char2FrameCount = isChar2Active ? char2ActionFrameCount : char2StopFrameCount;
  const char2SrcFrameWidth = isChar2Active ? char2ActionFrameWidth : char2StopFrameWidth;
  const char2SrcFrameHeight = isChar2Active ? char2ActionFrameHeight : char2StopFrameHeight;
  const char2CurrentScale = (height / 3) / char2SrcFrameHeight;
  const char2DrawWidth = char2SrcFrameWidth * char2CurrentScale;
  const char2DrawHeight = char2SrcFrameHeight * char2CurrentScale;
  const char2FrameIndex = floor(frameCount / framesPerStep) % char2FrameCount;
  const char2SourceX = char2FrameIndex * char2SrcFrameWidth;
  const char2Y = height - char2DrawHeight / 2;

  if (char2Sprite) {
    push();
    translate(char2X, char2Y);
    scale(char2Facing, 1);
    image(
      char2Sprite,
      0,
      0,
      char2DrawWidth,
      char2DrawHeight,
      char2SourceX,
      0,
      char2SrcFrameWidth,
      char2SrcFrameHeight
    );
    pop();
  }

  // 角色一施法與動畫繪製
  if (isCasting && frameCount - magicStartFrame >= magicFrameCount * framesPerStep) {
    isCasting = false;
    activeEffects.push({
      x: characterX + magicDirection * characterWidth / 2,
      y: height - characterHeight * 0.58,
      direction: magicDirection
    });
  }

  const activeSprite = isCasting ? magicSprite : isWalking ? walkSprite : characterSprite;
  const activeFrameCount = isCasting ? magicFrameCount : isWalking ? walkFrameCount : frameCountInSprite;
  const activeFrameWidth = isCasting ? magicFrameWidth : isWalking ? walkFrameWidth : frameWidth;
  const activeFrameHeight = isCasting ? magicFrameHeight : isWalking ? walkFrameHeight : frameHeight;
  const elapsedMagicFrames = frameCount - magicStartFrame;
  const frameIndex = isCasting
    ? floor(elapsedMagicFrames / framesPerStep)
    : floor(frameCount / framesPerStep) % activeFrameCount;
  const sourceX = frameIndex * activeFrameWidth;
  const activeWidth = activeFrameWidth * characterScale;
  const activeHeight = activeFrameHeight * characterScale;
  const characterY = height - activeHeight / 2;

  push();
  translate(characterX, characterY);
  scale(isCasting ? magicDirection : facingDirection, 1);
  image(activeSprite, 0, 0, activeWidth, activeHeight, sourceX, 0, activeFrameWidth, activeFrameHeight);
  pop();

  // 繪製飛行中的魔法特效
  const effectScale = characterScale;
  const effectWidth = effectFrameWidth * effectScale;
  const effectHeight = effectFrameHeight * effectScale;
  const effectSpeed = max(6, width * 0.008);
  for (let effectIndex = activeEffects.length - 1; effectIndex >= 0; effectIndex--) {
    const effect = activeEffects[effectIndex];
    effect.x += effect.direction * effectSpeed;
    if (effect.x > width || effect.x < 0) {
      activeEffects.splice(effectIndex, 1);
      continue;
    }
    const effectFrameIndex = floor(frameCount / framesPerStep) % effectFrameCount;
    push();
    translate(effect.x, effect.y);
    scale(effect.direction, 1);
    image(
      magicEffectSprite,
      0,
      0,
      effectWidth,
      effectHeight,
      effectFrameIndex * effectFrameWidth,
      0,
      effectFrameWidth,
      effectFrameHeight
    );
    pop();
  }

  // 當角色一接近角色二時，繪製數學選擇題方框
  if (isChar2Active && currentQuiz) {
    drawQuizBox();
  } else {
    optionButtons = [];
  }

  // 處理並繪製 3 秒煙火或閃電特效
  updateAndDrawFeedbackEffects();
}

// 繪製畫布上方的半透明數學選擇題方框
function drawQuizBox() {
  const boxW = width / 3;
  const boxH = height / 2;
  const boxX = width / 2 - boxW / 2; // 方框中間對準畫布中間
  const boxY = 16; // 方框上方靠近畫布上方

  push();
  rectMode(CORNER);

  // 透明度為 90 的方框底色
  fill(255, 255, 255, 90);
  stroke(255, 255, 255, 180);
  strokeWeight(2);
  rect(boxX, boxY, boxW, boxH, 16);

  // 題目標題與算式
  noStroke();
  fill(20, 30, 50);
  textAlign(CENTER, CENTER);

  const titleSize = constrain(min(boxW * 0.06, boxH * 0.075), 14, 24);
  textSize(titleSize);
  text("數學加法挑戰", boxX + boxW / 2, boxY + boxH * 0.13);

  const questionSize = constrain(min(boxW * 0.11, boxH * 0.14), 22, 42);
  textStyle(BOLD);
  textSize(questionSize);
  text(currentQuiz.question, boxX + boxW / 2, boxY + boxH * 0.28);
  textStyle(NORMAL);

  // 繪製四個選項按鈕（2x2 網格排列）
  optionButtons = [];
  const paddingX = boxW * 0.08;
  const gapX = boxW * 0.06;
  const gapY = boxH * 0.05;
  const btnW = (boxW - paddingX * 2 - gapX) / 2;
  const btnH = boxH * 0.19;
  const startY = boxY + boxH * 0.42;

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = floor(i / 2);
    const btnX = boxX + paddingX + col * (btnW + gapX);
    const btnY = startY + row * (btnH + gapY);

    optionButtons.push({ x: btnX, y: btnY, w: btnW, h: btnH, index: i });

    const isHovered =
      mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;

    // 決定按鈕顏色
    if (currentQuiz.selectedIndex === i) {
      if (currentQuiz.isCorrect) {
        fill(46, 204, 113, 230); // 答對綠色
      } else {
        fill(231, 76, 60, 230); // 答錯紅色
      }
    } else if (isHovered) {
      fill(255, 255, 255, 235);
    } else {
      fill(255, 255, 255, 195);
    }

    stroke(40, 60, 90, 160);
    strokeWeight(1.5);
    rect(btnX, btnY, btnW, btnH, 10);

    // 選項文字
    noStroke();
    fill(currentQuiz.selectedIndex === i ? 255 : 20, 30, 50);
    const btnTextSize = constrain(min(btnW * 0.22, btnH * 0.45), 16, 30);
    textSize(btnTextSize);
    const labels = ["A", "B", "C", "D"];
    text(`${labels[i]}. ${currentQuiz.options[i]}`, btnX + btnW / 2, btnY + btnH / 2);
  }

  // 顯示作答結果提示文字
  if (currentQuiz.isCorrect !== null) {
    textSize(constrain(boxH * 0.065, 13, 20));
    textStyle(BOLD);
    if (currentQuiz.isCorrect) {
      fill(20, 130, 60);
      text("答對了！煙火慶祝中...", boxX + boxW / 2, boxY + boxH * 0.91);
    } else {
      fill(190, 30, 30);
      text("答錯了！小心閃電！", boxX + boxW / 2, boxY + boxH * 0.91);
    }
    textStyle(NORMAL);
  }

  pop();
}

// 更新並繪製三秒煙火與閃電特效
function updateAndDrawFeedbackEffects() {
  const now = millis();

  // 檢查 3 秒特效是否結束
  if (feedbackType && now >= feedbackEndTime) {
    const finishedType = feedbackType;
    feedbackType = null;
    fireworks = [];
    // 若剛結束答對煙火且角色仍在旁邊，自動換下一題
    if (finishedType === "fireworks" && wasNearChar2) {
      generateMathQuestion();
    } else if (finishedType === "lightning" && currentQuiz) {
      currentQuiz.selectedIndex = -1;
      currentQuiz.isCorrect = null;
    }
  }

  // 繪製煙火特效
  if (feedbackType === "fireworks") {
    if (now >= nextFireworkTime) {
      spawnFirework(random(width * 0.15, width * 0.85), random(height * 0.15, height * 0.55));
      nextFireworkTime = now + random(250, 450);
    }
  }

  for (let i = fireworks.length - 1; i >= 0; i--) {
    const p = fireworks[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08; // 重力下墜
    p.alpha -= 4;
    if (p.alpha <= 0) {
      fireworks.splice(i, 1);
      continue;
    }
    push();
    noStroke();
    fill(p.r, p.g, p.b, p.alpha);
    circle(p.x, p.y, p.size);
    pop();
  }

  // 繪製閃電特效
  if (feedbackType === "lightning") {
    push();
    // 畫面微閃白光
    if (random() < 0.35) {
      noStroke();
      fill(255, 255, 220, random(30, 85));
      rect(0, 0, width, height);
    }

    // 繪製 1~2 道鋸齒狀閃電
    const boltCount = random() < 0.4 ? 2 : 1;
    for (let b = 0; b < boltCount; b++) {
      let lx = random(width * 0.15, width * 0.85);
      let ly = 0;
      const targetY = random(height * 0.65, height * 0.95);

      // 外層光暈
      stroke(180, 220, 255, 140);
      strokeWeight(10);
      noFill();
      beginShape();
      vertex(lx, ly);
      const segments = 12;
      const points = [{ x: lx, y: ly }];
      for (let s = 1; s <= segments; s++) {
        lx += random(-45, 45);
        ly = (targetY / segments) * s;
        points.push({ x: lx, y: ly });
        vertex(lx, ly);
      }
      endShape();

      // 內層亮白閃電核心
      stroke(255, 255, 240, 245);
      strokeWeight(3.5);
      beginShape();
      for (const pt of points) {
        vertex(pt.x, pt.y);
      }
      endShape();
    }
    pop();
  }
}

// 產生單發煙火粒子群
function spawnFirework(cx, cy) {
  const palette = [
    [255, 80, 80],
    [255, 215, 0],
    [80, 220, 255],
    [130, 255, 130],
    [255, 120, 240]
  ];
  const colorChoice = random(palette);
  const count = 45;
  for (let i = 0; i < count; i++) {
    const angle = (TWO_PI / count) * i + random(-0.1, 0.1);
    const speed = random(2, 7.5);
    fireworks.push({
      x: cx,
      y: cy,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      r: colorChoice[0],
      g: colorChoice[1],
      b: colorChoice[2],
      alpha: 255,
      size: random(4, 8)
    });
  }
}

// 滑鼠點擊處理：檢查是否點擊選項按鈕
function mousePressed() {
  if (!wasNearChar2 || !currentQuiz || optionButtons.length === 0) {
    return;
  }
  // 若正在播放特效中，避免重複觸發
  if (feedbackType && millis() < feedbackEndTime) {
    return;
  }

  for (const btn of optionButtons) {
    if (
      mouseX >= btn.x &&
      mouseX <= btn.x + btn.w &&
      mouseY >= btn.y &&
      mouseY <= btn.y + btn.h
    ) {
      currentQuiz.selectedIndex = btn.index;
      const chosenValue = currentQuiz.options[btn.index];
      const isCorrect = chosenValue === currentQuiz.answer;
      currentQuiz.isCorrect = isCorrect;

      if (isCorrect) {
        feedbackType = "fireworks";
        feedbackEndTime = millis() + 3000; // 3 秒煙火特效
        nextFireworkTime = 0;
      } else {
        feedbackType = "lightning";
        feedbackEndTime = millis() + 3000; // 3 秒閃電特效
      }
      break;
    }
  }
}

function keyPressed() { // 按下方向鍵時切換角色狀態與朝向
  if (keyCode === RIGHT_ARROW) {
    isWalking = true;
    facingDirection = 1;
    return false;
  }
  if (keyCode === LEFT_ARROW) {
    isWalking = true;
    facingDirection = -1;
    return false;
  }
  if (keyCode === 32) {
    if (!spaceIsDown && !isCasting) {
      isCasting = true;
      magicStartFrame = frameCount;
      magicDirection = facingDirection;
    }
    spaceIsDown = true;
    return false;
  }
}

function keyReleased() { // 鍵盤按鍵放開時更新按鍵狀態
  if (keyCode === 32) {
    spaceIsDown = false;
  }
}

function windowResized() { // 視窗尺寸改變時重新調整畫布
  resizeCanvas(windowWidth, windowHeight);
  characterX = constrain(characterX, 1, width - 1);
}