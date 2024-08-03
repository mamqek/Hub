<template>
    <template v-for="(link, linkname) in links" :key="linkname">
        <template v-if="!alreadyFetched.has(linkname) && linkname !='self'">
            <button v-if="Array.isArray(link)" 
                class="btn"
                v-for="(singleUrlObj, index) in link" :key="index" 
                @click="$emit('send-link', linkname, singleUrlObj.href)"
            >
                Retrieve {{ linkname }}
            </button>
            <button v-else 
                class="btn"
                @click="$emit('send-link', linkname, link.href)"
            >
                Retrieve {{ linkname }}
            </button>
        </template>
    </template>
</template>

<script>
    export default {
        name: "Links Buttons",

        props: ["links", "alreadyFetched"],
        emits: ['send-link'],
    }
</script>