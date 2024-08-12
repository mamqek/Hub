<template>
    <div class="box">
        <div class="text">

            <h3>{{ name }}</h3>
            <p class="info" v-for="(propVal, propName) in data.data" :key="propName" :data-label="propName">
                <template v-if="typeof propVal === 'object' && propVal !== null">
                    <ul>
                        <li v-for="(value, key) in propVal" :key="key">
                            <span>{{ key }}</span> : {{ value }}
                        </li>
                    </ul>
                </template>
                <template v-else>
                    {{ propVal }}
                </template>
            </p>
        </div>
        
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
    display: flex;
    flex-direction: column;
    width: 100%;

    contain: layout;
    container-type: inline-size; /* or block-size, depending on your layout needs */


    h3 {
        margin-bottom: 1rem;
    }

    p.info {
        background-color: var(--light-grey-color);
    }


    span {
        font-weight: 600;
    }
}



.bottom-slot {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 10px;
    place-items: end center;
}


</style>