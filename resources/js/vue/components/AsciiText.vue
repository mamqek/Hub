<template>
    <div class="vue-bits-ascii" ref="wrapper">
        <canvas ref="canvas" class="vue-bits-ascii__canvas"></canvas>
        <pre class="vue-bits-ascii__output" aria-hidden="true">{{ asciiOutput }}</pre>
    </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';

const CHARSET = " .'`^\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

const props = defineProps({
    text: {
        type: String,
        default: 'Mamqek',
    },
    resolution: {
        type: Number,
        default: 8,
    },
    speed: {
        type: Number,
        default: 0.45,
    },
});

const wrapper = ref(null);
const canvas = ref(null);
const asciiOutput = ref('');

let ctx = null;
let rafId = null;
let frame = 0;
let resizeObserver;

const drawAsciiFrame = () => {
    if (!ctx || !wrapper.value || !canvas.value) {
        rafId = requestAnimationFrame(drawAsciiFrame);
        return;
    }

    const width = Math.max(300, wrapper.value.clientWidth);
    const height = Math.max(180, wrapper.value.clientHeight);
    const cols = Math.floor(width / props.resolution);
    const rows = Math.floor(height / props.resolution);

    canvas.value.width = cols;
    canvas.value.height = rows;

    ctx.save();
    ctx.clearRect(0, 0, cols, rows);

    const gradient = ctx.createLinearGradient(0, 0, cols, rows);
    gradient.addColorStop(0, '#ff90f9');
    gradient.addColorStop(0.5, '#8f5dff');
    gradient.addColorStop(1, '#58dbff');

    ctx.fillStyle = gradient;
    ctx.font = `${rows * 0.95}px "Space Mono", "Fira Code", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(cols / 2, rows / 2);

    const wobble = Math.sin(frame * props.speed * 0.05) * 1.5;
    ctx.rotate(Math.sin(frame * 0.01) * 0.04);
    ctx.fillText(props.text.toUpperCase(), 0, wobble);
    ctx.restore();

    const { data } = ctx.getImageData(0, 0, cols, rows);
    let ascii = '';
    for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
            const offset = (y * cols + x) * 4;
            const brightness = (data[offset] + data[offset + 1] + data[offset + 2]) / 3 / 255;
            const index = Math.min(
                CHARSET.length - 1,
                Math.max(0, Math.floor((1 - brightness) * CHARSET.length))
            );
            ascii += CHARSET[index];
        }
        ascii += '\n';
    }
    asciiOutput.value = ascii;

    frame += 1;
    rafId = requestAnimationFrame(drawAsciiFrame);
};

const restartAnimation = () => {
    frame = 0;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(drawAsciiFrame);
};

onMounted(() => {
    if (canvas.value) {
        ctx = canvas.value.getContext('2d', { willReadFrequently: true });
    }

    resizeObserver = new ResizeObserver(() => restartAnimation());
    if (wrapper.value) {
        resizeObserver.observe(wrapper.value);
    }

    restartAnimation();
});

onUnmounted(() => {
    cancelAnimationFrame(rafId);
    resizeObserver?.disconnect();
});

watch(
    () => props.text,
    () => restartAnimation()
);
</script>

<style scoped>
.vue-bits-ascii {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 1.5rem;
    overflow: hidden;
    background: radial-gradient(circle at 20% 20%, rgba(255, 150, 249, 0.4), rgba(11, 7, 21, 0.95)),
        radial-gradient(circle at 80% 80%, rgba(78, 212, 255, 0.3), transparent 60%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 30px 50px rgba(5, 3, 10, 0.7);
}

.vue-bits-ascii__canvas {
    display: none;
}

.vue-bits-ascii__output {
    position: absolute;
    inset: 0;
    margin: 0;
    padding: 1.5rem;
    font-family: 'Space Mono', 'Fira Code', monospace;
    font-size: clamp(10px, 1.35vw, 18px);
    line-height: 1.05em;
    letter-spacing: -0.05em;
    color: rgba(248, 244, 255, 0.92);
    text-shadow: 0 0 12px rgba(147, 94, 255, 0.6);
    mix-blend-mode: screen;
    animation: shimmer 6s ease-in-out infinite;
    white-space: pre;
}

@keyframes shimmer {
    0% { opacity: 0.75; }
    50% { opacity: 1; }
    100% { opacity: 0.75; }
}
</style>
