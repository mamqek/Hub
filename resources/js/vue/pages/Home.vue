<template>
    <div class="home">
        <section
            class="hero"
            :style="heroStyle"
            @mousemove="handleMouseMove"
        >
            <div class="hero__background">
                <div class="hero__gradient"></div>
                <div class="hero__grid hero__grid--one"></div>
                <div class="hero__grid hero__grid--two"></div>
                <div class="hero__orb hero__orb--left" :style="leftOrbStyle" aria-hidden="true"></div>
                <div class="hero__orb hero__orb--right" :style="rightOrbStyle" aria-hidden="true"></div>
                <div class="hero__logo-badge">
                    <img :src="logoSrc" :alt="$t('hero_logo_caption')" loading="lazy">
                    <span>{{ $t('hero_logo_caption') }}</span>
                </div>
            </div>

            <div class="hero__content">
                <p class="eyebrow">{{ $t('hero_eyebrow') }}</p>
                <h1>
                    <span>{{ $t('hero_title_lead') }}</span>
                    <span class="accent">{{ $t('hero_title_accent') }}</span>
                </h1>
                <p class="hero__tagline">
                    {{ $t('hero_tagline') }}
                </p>

                <div class="hero__cta">
                    <a class="btn btn-primary" href="#projects">
                        {{ $t('hero_primary_cta') }}
                    </a>
                    <a
                        class="btn btn-ghost"
                        :href="profileUrl"
                        target="_blank"
                        rel="noreferrer noopener"
                    >
                        {{ $t('hero_secondary_cta') }}
                        <i class="bx bx-right-arrow-alt" aria-hidden="true"></i>
                    </a>
                </div>

                <dl class="hero__stats">
                    <div v-for="stat in heroStats" :key="stat.label">
                        <dt>{{ stat.label }}</dt>
                        <dd>{{ stat.value }}</dd>
                    </div>
                </dl>
            </div>

            <div class="hero__ascii" aria-hidden="true">
                <div class="hero__ascii-core">
                    <AsciiText text="Mamqek" :resolution="9" :speed="0.35" />
                </div>
                <small>{{ $t('hero_ascii_caption') }}</small>
            </div>

            <a class="hero__scroll-hint" href="#projects">
                <span>{{ $t('hero_scroll_hint') }}</span>
                <i class="bx bx-chevron-down" aria-hidden="true"></i>
            </a>
        </section>

        <section id="projects" class="projects">
            <header class="section-heading">
                <p class="eyebrow">{{ $t('projects_label') }}</p>
                <h2>{{ $t('projects_title') }}</h2>
                <p class="subtitle">{{ $t('projects_subtitle') }}</p>
            </header>

            <div v-if="isLoading" class="projects__state">
                <div class="projects__loader" aria-hidden="true"></div>
                <p>{{ $t('projects_loading') }}</p>
            </div>

            <div v-else-if="errorMessage" class="projects__state projects__state--error">
                <p>{{ $t('projects_error') }}</p>
                <button class="btn btn-ghost" @click="fetchProjects">
                    {{ $t('projects_retry') }}
                </button>
            </div>

            <div v-else class="project-stack">
                <article
                    v-for="(project, index) in curatedProjects"
                    :key="project.id"
                    class="project-section"
                    :class="{ 'project-section--reverse': index % 2 === 1 }"
                    :ref="registerProjectSection"
                >
                    <div class="project-section__media">
                        <div class="project-section__halo" aria-hidden="true"></div>

                        <div class="project-section__label">
                            <span>{{ project.timelineLabel }}</span>
                            <span>{{ project.relativeUpdated }}</span>
                        </div>

                        <div v-if="index === 0" class="project-section__ascii">
                            <AsciiText :text="project.name" :resolution="8" :speed="0.4" />
                        </div>
                        <div v-else class="project-section__tech-cloud">
                            <span
                                v-for="tech in project.languagesPreview"
                                :key="`${project.id}-${tech}`"
                                class="cloud-chip"
                            >
                                {{ tech }}
                            </span>
                            <span
                                v-for="topic in project.topicPreview"
                                :key="`${project.id}-${topic}`"
                                class="cloud-chip cloud-chip--topic"
                            >
                                #{{ topic }}
                            </span>
                        </div>
                    </div>

                    <div class="project-section__content">
                        <p class="project-section__eyebrow">
                            {{ $t('project_focus_label') }} · {{ project.focusLabel }}
                        </p>
                        <h3>{{ project.name }}</h3>
                        <p class="project-section__description">
                            {{ project.description || $t('project_no_description') }}
                        </p>

                        <ul class="project-section__tech">
                            <li
                                v-for="chip in project.techSummary"
                                :key="`${project.id}-${chip}`"
                            >
                                {{ chip }}
                            </li>
                        </ul>

                        <dl class="project-section__meta">
                            <div>
                                <dt>{{ $t('project_language_primary') }}</dt>
                                <dd>{{ project.language || '—' }}</dd>
                            </div>
                            <div>
                                <dt>{{ $t('project_languages') }}</dt>
                                <dd>
                                    {{
                                        project.languagesList.length
                                            ? project.languagesList.join(', ')
                                            : $t('project_languages_placeholder')
                                    }}
                                </dd>
                            </div>
                            <div>
                                <dt>{{ $t('project_last_push') }}</dt>
                                <dd>{{ $t('project_last_updated', { time: project.relativeUpdated }) }}</dd>
                            </div>
                            <div>
                                <dt>{{ $t('project_started') }}</dt>
                                <dd>{{ project.readableCreated }}</dd>
                            </div>
                        </dl>

                        <div class="project-section__links">
                            <a
                                class="btn btn-secondary"
                                :href="project.htmlUrl"
                                target="_blank"
                                rel="noreferrer noopener"
                            >
                                {{ $t('project_view_code') }}
                            </a>
                            <a
                                v-if="project.homepage"
                                class="btn btn-primary btn-primary--ghost"
                                :href="project.homepage"
                                target="_blank"
                                rel="noreferrer noopener"
                            >
                                {{ $t('project_view_live') }}
                            </a>
                        </div>
                    </div>
                </article>
            </div>
        </section>
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AsciiText from '@/components/AsciiText.vue';

const profileUrl = 'https://github.com/mamqek';
const logoSrc = new URL('../../../../public/images/logo.png', import.meta.url).href;

const repositories = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');
const sectionObserver = ref(null);
const pendingSections = [];

const parallax = reactive({
    scroll: 0,
    tiltX: 0,
    tiltY: 0,
});

const { t, locale } = useI18n();

const heroStats = computed(() => ([
    { value: '20+', label: t('hero_stat_projects') },
    { value: '5+', label: t('hero_stat_years') },
    { value: '8', label: t('hero_stat_toolstack') },
]));

const heroStyle = computed(() => ({
    '--scroll-progress': parallax.scroll,
    '--tilt-x': `${parallax.tiltX}deg`,
    '--tilt-y': `${parallax.tiltY}deg`,
}));

const leftOrbStyle = computed(() => ({
    transform: `translate3d(${parallax.scroll * -40}px, ${parallax.scroll * -80}px, 0) rotate(${parallax.tiltY}deg)`,
}));

const rightOrbStyle = computed(() => ({
    transform: `translate3d(${parallax.scroll * 40}px, ${parallax.scroll * -50}px, 0) rotate(${-parallax.tiltY}deg)`,
}));

const curatedProjects = computed(() => {
    const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' });

    return repositories.value.map((repo) => ({
        ...repo,
        relativeUpdated: formatRelativeTime(repo.updatedAt, rtf),
        readableCreated: formatDate(repo.createdAt),
        timelineLabel: t('project_timeline', { year: new Date(repo.createdAt).getFullYear() }),
        focusLabel: repo.focusLabel || describeFocus(repo),
        techSummary: repo.techSummary || buildTechSummary(repo),
        languagesPreview: repo.languagesList.slice(0, 3),
        topicPreview: (repo.topics || []).slice(0, 3),
    }));
});

const fetchProjects = async () => {
    isLoading.value = true;
    errorMessage.value = '';

    try {
        const response = await fetch('https://api.github.com/users/mamqek/repos?sort=updated&per_page=12', {
            headers: {
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        const trimmed = data
            .filter((repo) => !repo.fork)
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, 5);

        const enriched = await Promise.all(trimmed.map(async (repo) => {
            const languages = await fetchLanguagesForRepo(repo.languages_url);
            return {
                id: repo.id,
                name: repo.name,
                description: repo.description,
                htmlUrl: repo.html_url,
                homepage: repo.homepage,
                stars: repo.stargazers_count,
                language: repo.language,
                topics: repo.topics ?? [],
                updatedAt: repo.pushed_at,
                createdAt: repo.created_at,
                languagesList: languages,
                focusLabel: describeFocus(repo),
                techSummary: buildTechSummary(repo, languages),
            };
        }));

        repositories.value = enriched;
    } catch (error) {
        console.error('Failed to load repositories:', error);
        errorMessage.value = error.message || 'Unable to load repositories.';
    } finally {
        isLoading.value = false;
    }
};

const fetchLanguagesForRepo = async (url) => {
    if (!url) {
        return [];
    }

    try {
        const res = await fetch(url, {
            headers: {
                Accept: 'application/vnd.github+json',
            },
        });
        if (!res.ok) {
            return [];
        }
        const json = await res.json();
        return Object.keys(json || {});
    } catch {
        return [];
    }
};

const handleScroll = () => {
    const scroll = Math.min(window.scrollY / window.innerHeight, 1.3);
    parallax.scroll = Number(scroll.toFixed(2));
};

const handleMouseMove = (event) => {
    if (window.innerWidth <= 768) {
        return;
    }

    const { innerWidth, innerHeight } = window;
    parallax.tiltX = ((event.clientY / innerHeight) - 0.5) * -6;
    parallax.tiltY = ((event.clientX / innerWidth) - 0.5) * 6;
};

const registerProjectSection = (el) => {
    if (!el) {
        return;
    }

    if (sectionObserver.value) {
        sectionObserver.value.observe(el);
    } else {
        pendingSections.push(el);
    }
};

onMounted(() => {
    fetchProjects();
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });

    sectionObserver.value = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                sectionObserver.value?.unobserve(entry.target);
            }
        });
    }, { threshold: 0.35 });

    pendingSections.splice(0).forEach((el) => sectionObserver.value.observe(el));
});

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
    sectionObserver.value?.disconnect();
});

const describeFocus = (repo) => {
    const topics = repo.topics ?? [];
    if (topics.length) {
        return topics
            .slice(0, 2)
            .map((topic) => startCase(topic))
            .join(' · ');
    }

    return startCase(repo.language || 'Full stack experiments');
};

const buildTechSummary = (repo, languages = []) => {
    const heuristics = [
        { label: 'Vue 3', regex: /vue/i },
        { label: 'Laravel', regex: /laravel|php/i },
        { label: 'TypeScript', regex: /typescript|ts/i },
        { label: 'Tailwind', regex: /tailwind/i },
        { label: 'PostgreSQL', regex: /postgres|pgsql/i },
        { label: 'Realtime APIs', regex: /socket|realtime|websocket/i },
    ];

    const source = `${repo.name} ${repo.description ?? ''} ${(repo.topics || []).join(' ')}`;
    const detected = heuristics
        .filter(({ regex }) => regex.test(source))
        .map(({ label }) => label);

    const normalizedLanguages = languages.map((lang) => startCase(lang));
    const normalizedTopics = (repo.topics || []).map((topic) => startCase(topic));

    const combined = Array.from(new Set([
        ...normalizedLanguages,
        ...normalizedTopics,
        ...detected,
    ])).filter(Boolean);

    return combined.length ? combined.slice(0, 6) : ['Creative tooling'];
};

const formatRelativeTime = (dateString, rtf) => {
    if (!dateString) {
        return rtf.format(0, 'second');
    }

    const diff = Date.now() - new Date(dateString).getTime();
    const units = [
        { unit: 'year', value: 1000 * 60 * 60 * 24 * 365 },
        { unit: 'month', value: 1000 * 60 * 60 * 24 * 30 },
        { unit: 'week', value: 1000 * 60 * 60 * 24 * 7 },
        { unit: 'day', value: 1000 * 60 * 60 * 24 },
        { unit: 'hour', value: 1000 * 60 * 60 },
        { unit: 'minute', value: 1000 * 60 },
    ];

    for (const { unit, value } of units) {
        const delta = Math.floor(diff / value);
        if (Math.abs(delta) >= 1) {
            return rtf.format(-delta, unit);
        }
    }

    const seconds = Math.max(Math.floor(diff / 1000), 0);
    return seconds ? rtf.format(-seconds, 'second') : rtf.format(0, 'second');
};

const formatDate = (dateString) => {
    if (!dateString) {
        return '—';
    }

    try {
        return new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' })
            .format(new Date(dateString));
    } catch {
        return dateString;
    }
};

const startCase = (value) => value
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
</script>

<style scoped>
.home {
    background: radial-gradient(circle at 10% 20%, #120b21, #050106 55%);
    color: #efeafc;
}

.eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.35em;
    font-size: 0.75rem;
    color: #c7b5ff;
}

.hero {
    position: relative;
    min-height: calc(100vh - var(--navbar-height));
    padding: calc(var(--navbar-height) + 3rem) clamp(1.5rem, 4vw, 4rem) 5rem;
    display: grid;
    gap: clamp(2rem, 5vw, 6rem);
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    overflow: hidden;
}

.hero__background {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.hero__gradient {
    position: absolute;
    inset: -20%;
    background: radial-gradient(circle at 20% 30%, rgba(122, 73, 255, 0.8), transparent 45%),
        radial-gradient(circle at 80% 20%, rgba(77, 188, 255, 0.5), transparent 50%),
        radial-gradient(circle at 50% 90%, rgba(136, 16, 255, 0.55), transparent 60%);
    filter: blur(calc(40px + (var(--scroll-progress) * 10px)));
    transform: scale(calc(1 + var(--scroll-progress) * 0.1));
    transition: filter 0.6s ease, transform 0.6s ease;
}

.hero__grid {
    position: absolute;
    inset: -5%;
    background-image: linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
    background-size: 120px 120px;
    mix-blend-mode: screen;
    opacity: 0.35;
}

.hero__grid--one {
    transform: translate3d(0, calc(var(--scroll-progress) * -30px), 0) rotate(2deg);
}

.hero__grid--two {
    opacity: 0.15;
    transform: translate3d(0, calc(var(--scroll-progress) * -60px), 0) rotate(-4deg);
}

.hero__orb {
    position: absolute;
    width: clamp(180px, 25vw, 260px);
    aspect-ratio: 1;
    border-radius: 50%;
    filter: blur(8px);
    opacity: 0.7;
    background: radial-gradient(circle, rgba(192, 120, 255, 0.75), rgba(21, 10, 31, 0.05));
}

.hero__orb--right {
    right: 10%;
    top: 20%;
}

.hero__orb--left {
    left: 5%;
    bottom: 5%;
    background: radial-gradient(circle, rgba(93, 215, 255, 0.65), rgba(21, 10, 31, 0.05));
}

.hero__logo-badge {
    position: absolute;
    right: clamp(1rem, 6vw, 6rem);
    bottom: clamp(1rem, 6vw, 5rem);
    padding: 1rem 1.5rem;
    border-radius: 999px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(9, 4, 16, 0.65);
    border: 1px solid rgba(173, 133, 255, 0.4);
    backdrop-filter: blur(12px);
    box-shadow: 0 20px 40px rgba(101, 21, 255, 0.25);
}

.hero__logo-badge img {
    width: 42px;
    height: 42px;
    object-fit: contain;
    filter: drop-shadow(0 0 12px rgba(157, 117, 255, 0.7));
}

.hero__content {
    position: relative;
    z-index: 2;
    max-width: 580px;
}

.hero h1 {
    font-size: clamp(2.5rem, 4vw, 4.5rem);
    line-height: 1.05;
    margin: 1rem 0;
    font-weight: 700;
}

.hero h1 .accent {
    display: block;
    color: #d6c1ff;
    background: linear-gradient(120deg, #b06ef7, #6fe3ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.hero__tagline {
    font-size: 1.125rem;
    color: #d8d0f5;
    margin-bottom: 2rem;
}

.hero__cta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 2.5rem;
}

.btn {
    border-radius: 999px;
    padding: 0.9rem 1.8rem;
    font-weight: 600;
    border: 1px solid transparent;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
    transition: transform 0.3s ease, box-shadow 0.4s ease, background 0.3s ease;
}

.btn-primary {
    background: linear-gradient(120deg, #7c27ff, #b161ff);
    color: #fefefe;
    box-shadow: 0 10px 30px rgba(129, 51, 255, 0.4);
}

.btn-primary--ghost {
    background: transparent;
    border-color: rgba(190, 156, 255, 0.4);
}

.btn-secondary {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    color: inherit;
}

.btn-ghost {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.15);
    color: inherit;
}

.btn:hover {
    transform: translateY(-3px);
}

.hero__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
    text-transform: uppercase;
}

.hero__stats dt {
    font-size: 0.7rem;
    letter-spacing: 0.3em;
    color: #a896df;
}

.hero__stats dd {
    font-size: 2.25rem;
    font-weight: 700;
    margin: 0.35rem 0 0;
    color: #fdf5ff;
}

.hero__ascii {
    position: relative;
    z-index: 2;
    align-self: center;
    justify-self: center;
    text-align: center;
}

.hero__ascii-core {
    width: clamp(260px, 40vw, 420px);
    height: clamp(220px, 32vw, 320px);
}

.hero__ascii :deep(.vue-bits-ascii) {
    height: 100%;
}

.hero__ascii small {
    display: block;
    margin-top: 0.75rem;
    font-size: 0.75rem;
    letter-spacing: 0.28em;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
}

.hero__scroll-hint {
    position: absolute;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    font-size: 0.85rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
}

.hero__scroll-hint i {
    animation: floatDown 1.8s ease-in-out infinite;
}

@keyframes floatDown {
    0% { transform: translateY(0); }
    50% { transform: translateY(8px); }
    100% { transform: translateY(0); }
}

.projects {
    padding: 4rem clamp(1.5rem, 4vw, 5rem) 5rem;
    background: radial-gradient(circle at 80% 0%, rgba(86, 40, 130, 0.35), transparent 45%),
        #050106;
}

.section-heading {
    text-align: center;
    max-width: 680px;
    margin: 0 auto 3rem;
}

.section-heading h2 {
    font-size: clamp(2rem, 3vw, 3rem);
    margin: 1rem 0;
}

.section-heading .subtitle {
    color: #c9c1df;
    line-height: 1.6;
}

.projects__state {
    text-align: center;
    padding: 3rem 1rem;
}

.projects__state--error p {
    margin-bottom: 1rem;
    color: #ffafc7;
}

.projects__loader {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 4px solid rgba(255, 255, 255, 0.15);
    border-top-color: #c896ff;
    margin: 0 auto 1rem;
    animation: spin 0.9s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.project-stack {
    display: flex;
    flex-direction: column;
    gap: clamp(2.5rem, 6vw, 4rem);
}

.project-section {
    position: relative;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: clamp(1.5rem, 4vw, 3rem);
    align-items: stretch;
    padding: clamp(1.5rem, 3vw, 2.5rem);
    border-radius: 2rem;
    border: 1px solid rgba(199, 142, 255, 0.18);
    background: rgba(14, 8, 21, 0.75);
    box-shadow: 0 25px 40px rgba(4, 2, 8, 0.75);
    opacity: 0;
    transform: translateY(60px);
    transition: opacity 0.8s ease, transform 0.8s ease;
}

.project-section.is-visible {
    opacity: 1;
    transform: translateY(0);
}

.project-section--reverse {
    direction: rtl;
}

.project-section--reverse > * {
    direction: ltr;
}

.project-section__media {
    position: relative;
    min-height: 320px;
    border-radius: 1.5rem;
    overflow: hidden;
    background: radial-gradient(circle at 20% 20%, rgba(182, 133, 255, 0.4), rgba(11, 7, 21, 0.95));
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
}

.project-section__halo {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.08), transparent 50%);
    filter: blur(30px);
    animation: pulse 6s ease-in-out infinite;
}

@keyframes pulse {
    0% { opacity: 0.4; }
    50% { opacity: 0.8; }
    100% { opacity: 0.4; }
}

.project-section__label {
    position: absolute;
    top: 1rem;
    left: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.75rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.65);
}

.project-section__ascii {
    width: 100%;
    height: 100%;
}

.project-section__ascii :deep(.vue-bits-ascii) {
    height: 100%;
}

.project-section__tech-cloud {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
}

.cloud-chip {
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    font-size: 0.85rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}

.cloud-chip--topic {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
}

.project-section__content {
    position: relative;
    z-index: 2;
}

.project-section__eyebrow {
    font-size: 0.8rem;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.6);
}

.project-section__description {
    color: #dcd3ef;
    line-height: 1.7;
    margin-bottom: 1.5rem;
}

.project-section__tech {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    padding: 0;
    margin: 0 0 1.5rem;
    list-style: none;
}

.project-section__tech li {
    padding: 0.45rem 1rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.9rem;
}

.project-section__meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.project-section__meta div {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 1rem;
    padding: 0.9rem 1rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.project-section__meta dt {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.25em;
    color: rgba(255, 255, 255, 0.55);
}

.project-section__meta dd {
    margin: 0.4rem 0 0;
    font-size: 0.95rem;
    color: #fff;
}

.project-section__links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

@media (max-width: 768px) {
    .hero {
        grid-template-columns: 1fr;
        padding-top: calc(var(--navbar-height) + 2rem);
    }

    .hero__cta {
        flex-direction: column;
        align-items: stretch;
    }

    .hero__logo-badge {
        position: static;
        margin-top: 1rem;
    }

    .hero__scroll-hint {
        position: static;
        transform: none;
        margin-top: 2rem;
        justify-content: center;
    }
}

@media (prefers-reduced-motion: reduce) {
    .hero__gradient,
    .hero__grid,
    .hero__orb,
    .hero__scroll-hint i,
    .btn,
    .project-section {
        animation: none;
        transition: none;
        transform: none !important;
    }
}
</style>
