// Three.js setup
let scene, camera, renderer;
let stars = [];
let mouseX = 0;
let mouseY = 0;
let targetZ = 3000;  // 增加初始观察距离
let clock;  // 用于动画计时
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let targetRotation = { x: 0, y: 0 };
let currentRotation = { x: 0, y: 0 };
let isWarping = false;
let warpSpeed = 0;
let targetWarpSpeed = 0;
let warpDirection = { x: 0, y: 0, rotation: 0 }; // 添加穿越方向控制
let warpProgress = 0; // 添加穿越进度控制
let currentEffect = { x: 0, y: 0, rotation: 0 }; // 当前效果状态
let currentColorTheme = {
    primary: new THREE.Color(1, 1, 1),
    secondary: new THREE.Color(0.6, 0.6, 1),
    intensity: 1.0
};

let targetColorTheme = {
    primary: new THREE.Color(1, 1, 1),
    secondary: new THREE.Color(0.6, 0.6, 1),
    intensity: 1.0
};

const pageThemes = {
    'home': {
        primary: new THREE.Color(1, 1, 1),      // 白色主题
        secondary: new THREE.Color(0.6, 0.6, 1), // 淡蓝色
        intensity: 1.0
    },
    'about': {
        primary: new THREE.Color(1, 0.8, 0.4),   // 金色主题
        secondary: new THREE.Color(1, 0.6, 0.2),
        intensity: 1.2
    },
    'projects': {
        primary: new THREE.Color(0.4, 0.8, 1),   // 蓝色主题
        secondary: new THREE.Color(0.2, 0.6, 1),
        intensity: 1.1
    },
    'contact': {
        primary: new THREE.Color(0.7, 0.5, 0.8),   // 柔和的淡紫色
        secondary: new THREE.Color(0.5, 0.3, 0.7),  // 深紫色调柔和
        intensity: 0.95                             // 降低整体亮度
    }
};

// 添加轮播相关变量
let currentIndex = 0;
const totalCards = 3;
const anglePerCard = 360 / totalCards;
let autoRotateInterval;

function init() {
    clock = new THREE.Clock();
    
    // Scene setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.00012); // 减小雾效密度以看到更多星星

    // 使用更大的视野角度和更远的视距
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 8000);
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('space-container').appendChild(renderer.domElement);

    // Camera position
    camera.position.z = targetZ;

    // Create multiple star layers for depth
    createStarLayer(20000, 6000, 1.2);  // 远层更多星星
    createStarLayer(15000, 4000, 1.5);  // 中层星星
    createStarLayer(8000, 2000, 1.8);   // 近层大星星
    createStarLayer(2000, 1000, 2.5);   // 最近层超大星星

    // Add a subtle glow effect to the scene
    const light = new THREE.AmbientLight(0x404040);
    scene.add(light);

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('wheel', onMouseWheel, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('mouseleave', onMouseUp, false);
}

function createStarLayer(count, radius, sizeFactor) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const colorMix = new Float32Array(count);
    const twinkleSpeed = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        // 使用球面分布而不是立方体分布
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = Math.pow(Math.random(), 0.5) * radius; // 使用开方来创造更密集的中心分布

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // 基于距离调整大小和颜色
        const distance = Math.sqrt(
            positions[i * 3] ** 2 + 
            positions[i * 3 + 1] ** 2 + 
            positions[i * 3 + 2] ** 2
        );
        const distanceFactor = 1 - (distance / radius);

        // 增加大小变化范围
        const randomSize = Math.random();
        const sizeBoost = randomSize * randomSize * 3; // 二次方分布，创造更多小星星和少量大星星
        sizes[i] = (sizeBoost + 1) * sizeFactor * (distanceFactor * 0.5 + 0.5);
        
        // 闪烁速度也随距离变化
        twinkleSpeed[i] = (Math.random() * 2 + 0.5) * (distanceFactor * 0.5 + 0.5);

        // 增强的颜色效果
        const blueIntensity = Math.min(1, 0.6 + distanceFactor * 0.4);
        const brightness = Math.random() * 0.2 + 0.8; // 随机亮度变化
        colors[i * 3] = distanceFactor * brightness;     // R
        colors[i * 3 + 1] = distanceFactor * brightness; // G
        colors[i * 3 + 2] = blueIntensity * brightness;  // B (更蓝)

        // 添加颜色混合属性
        colorMix[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('colorMix', new THREE.BufferAttribute(colorMix, 1));
    geometry.setAttribute('twinkleSpeed', new THREE.BufferAttribute(twinkleSpeed, 1));

    const starMaterial = new THREE.ShaderMaterial({
        uniforms: {
            pixelRatio: { value: renderer.getPixelRatio() },
            time: { value: 0 },
            primaryColor: { value: currentColorTheme.primary },
            secondaryColor: { value: currentColorTheme.secondary },
            colorIntensity: { value: currentColorTheme.intensity }
        },
        vertexShader: `
            attribute float size;
            attribute float colorMix;
            attribute float twinkleSpeed;
            varying vec3 vColor;
            varying float vColorMix;
            uniform float time;
            uniform float pixelRatio;
            uniform vec3 primaryColor;
            uniform vec3 secondaryColor;
            uniform float colorIntensity;
            
            void main() {
                vColorMix = colorMix;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                float distance = length(mvPosition.xyz);
                float twinkle = sin(time * twinkleSpeed) * 0.5 + 0.5;
                gl_PointSize = size * (1.0 + twinkle * 0.6) * pixelRatio * (1200.0 / distance);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying float vColorMix;
            uniform vec3 primaryColor;
            uniform vec3 secondaryColor;
            uniform float colorIntensity;
            
            void main() {
                float distance = length(gl_PointCoord - vec2(0.5, 0.5));
                if (distance > 0.5) discard;
                
                vec3 starColor = mix(primaryColor, secondaryColor, vColorMix);
                float intensity = pow(1.0 - distance * 1.6, 2.5) * colorIntensity;
                vec3 finalColor = starColor * intensity * 1.5;
                
                float centerBoost = 1.0 - smoothstep(0.0, 0.2, distance);
                finalColor += centerBoost * 0.5 * primaryColor;
                
                gl_FragColor = vec4(finalColor, intensity);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const starSystem = new THREE.Points(geometry, starMaterial);
    scene.add(starSystem);
    stars.push(starSystem);
}

function onMouseDown(event) {
    isDragging = true;
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseUp() {
    isDragging = false;
}

function onMouseWheel(event) {
    // 扩大缩放范围
    targetZ = Math.max(800, Math.min(5000, targetZ + event.deltaY * 0.8));
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    if (!isDragging) {
        mouseX = (event.clientX - window.innerWidth / 2) / 200;
        mouseY = (event.clientY - window.innerHeight / 2) / 200;
        return;
    }

    const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
    };

    targetRotation.y += deltaMove.x * 0.01;
    targetRotation.x += deltaMove.y * 0.01;

    // 限制垂直旋转角度
    targetRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotation.x));

    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    // 平滑相机移动
    if (!isDragging) {
        camera.position.x += (mouseX - camera.position.x) * 0.02;
        camera.position.y += (-mouseY - camera.position.y) * 0.02;
    }
    camera.position.z += (targetZ - camera.position.z) * 0.05;

    // 平滑旋转
    currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1;
    currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1;

    // 平滑过渡曲速效果
    warpSpeed += (targetWarpSpeed - warpSpeed) * 0.1;

    // 更新穿越进度
    if (isWarping) {
        warpProgress = Math.min(1, warpProgress + 0.02); // 减慢加速过程
    } else {
        warpProgress = Math.max(0, warpProgress - 0.015); // 减慢减速过程
    }

    // 使用缓动函数使过渡更平滑
    const easeProgress = easeInOutCubic(warpProgress);

    // 平滑过渡当前效果
    currentEffect.x += (warpDirection.x - currentEffect.x) * 0.08;
    currentEffect.y += (warpDirection.y - currentEffect.y) * 0.08;
    currentEffect.rotation += (warpDirection.rotation - currentEffect.rotation) * 0.05; // 降低旋转过渡速度

    // 颜色主题平滑过渡
    currentColorTheme.primary.lerp(targetColorTheme.primary, 0.02);
    currentColorTheme.secondary.lerp(targetColorTheme.secondary, 0.02);
    currentColorTheme.intensity += (targetColorTheme.intensity - currentColorTheme.intensity) * 0.02;

    // 应用旋转和曲速效果到所有星星层
    stars.forEach((starSystem, index) => {
        starSystem.rotation.x = currentRotation.x;
        starSystem.rotation.y = currentRotation.y;
        
        // 星际穿越效果
        if (warpProgress > 0) {
            const speedFactor = index === 0 ? 2 : index === 1 ? 4 : index === 2 ? 6 : 8;
            const speed = warpSpeed * easeProgress;
            
            // 应用不同方向的穿越效果，使用当前效果状态
            starSystem.position.x += speed * currentEffect.x * speedFactor;
            starSystem.position.y += speed * currentEffect.y * speedFactor;
            starSystem.position.z = (starSystem.position.z + speed * speedFactor) % 3000;
            
            // 添加更平滑的旋转效果
            if (currentEffect.rotation !== 0) {
                starSystem.rotation.z += currentEffect.rotation * speed * 0.005 * easeProgress; // 降低旋转速度
            }

            // 循环处理位置
            if (starSystem.position.z < -1500) starSystem.position.z += 3000;
            if (Math.abs(starSystem.position.x) > 3000) {
                starSystem.position.x = -Math.sign(starSystem.position.x) * 3000;
            }
            if (Math.abs(starSystem.position.y) > 3000) {
                starSystem.position.y = -Math.sign(starSystem.position.y) * 3000;
            }
        }
        
        starSystem.material.uniforms.primaryColor.value = currentColorTheme.primary;
        starSystem.material.uniforms.secondaryColor.value = currentColorTheme.secondary;
        starSystem.material.uniforms.colorIntensity.value = currentColorTheme.intensity;
        starSystem.material.uniforms.time.value = time;
    });

    camera.lookAt(scene.position);
    renderer.render(scene, camera);
}

// 添加缓动函数
function easeInOutCubic(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Page transitions with enhanced effects
function handleNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const pageEffects = {
        'home': { x: 0, y: 0, rotation: 0 },      // 直线穿越
        'about': { x: 1, y: 0, rotation: 0 },     // 向右穿越
        'projects': { x: -1, y: 0, rotation: 0 }, // 向左穿越
        'contact': { x: 0, y: 0, rotation: 0.7 }  // 降低旋转强度
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = item.getAttribute('data-page');

            // Update navigation
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // 设置目标颜色主题
            targetColorTheme = pageThemes[targetPage];

            // 设置穿越方向
            warpDirection = pageEffects[targetPage];

            // 触发星际穿越效果
            isWarping = true;
            targetWarpSpeed = 20; // 降低整体最大速度
            
            // 在动画结束时停止星际穿越效果
            setTimeout(() => {
                isWarping = false;
                
                // 延迟重置位置，等待减速完成
                setTimeout(() => {
                    if (warpProgress === 0) {
                        stars.forEach(starSystem => {
                            starSystem.position.x = 0;
                            starSystem.position.y = 0;
                            starSystem.rotation.z = 0;
                        });
                    }
                }, 1000);
            }, 1000);

            // Page transition
            pages.forEach(page => {
                if (page.id === targetPage) {
                    page.classList.add('active');
                } else {
                    page.classList.remove('active');
                }
            });
        });
    });
}

// Initialize everything
init();
animate();
handleNavigation(); 