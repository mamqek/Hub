<template>
    <div class="box">
        <h3>{{ name }}</h3>
        <p v-for="(propVal, propName) in data.data" :key="propName" >
            <template v-if="typeof propVal === 'object' && propVal !== null">
                <span>{{ propName }}</span> :
                <ul>
                    <li v-for="(value, key) in propVal" :key="key">
                        <span>{{ key }}</span> : {{ value }}
                    </li>
                </ul>
            </template>
            <template v-else>
                <span>{{ propName }}</span> : {{ propVal }}
            </template>
        </p>
        
        <div class="bottom-slot">

            <slot></slot>
        </div>

    </div>
</template>

<script>
export default {
    name: 'Kadaster Response Box',
    props : ['data', 'name'],

}

</script>

<style scoped>

.box {
    flex-grow: 1;
    max-width: calc(50% - var(--div-gap)); 

    span {
        font-weight: 600;
    }
}



.bottom-slot {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 10px;
}


</style>