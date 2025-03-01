<template>

    <form @submit.prevent="saveClient" class="content">

        <div class="client-info">

            <InputText
                v-model="client.name"
                id="name"
                :label="`${$t('name')}:`"
                required
            />

            <InputText
                v-model="client.date"
                type="date"
                id="date"
                :label="`${$t('date')}:`"
                required
            />

            <InputText
                v-model="client.dateOfBirth"
                type="date"
                id="date_of_birth"
                :label="`${$t('date_of_birth')}:`"
                required
            />

        </div>

        <div class="soul-choose-numbers">

            <InputNumber v-for="({key, value}, index) in entries" :key="key"
                v-model="chosenSoulNumbers[key]"
                :min="1"
                :max="7"
                :id="`${key}-num`"
                :label="soulGroupNamesByLang[index]"
                :class="index == 6 ? 'center' : ''" 
                :style="`background-color: ${colors[value-1]};`"
            />

            <button type="button" @click="showSoulsText" class="btn center">{{ $t('submit') }}</button>
        
        </div>

        <SoulNumbersList v-if="chosenSouls.length > 0"
            :objArr="chosenSouls"
            :colors="colors"
            :headers="soulGroupNamesByLang"
        />
        
        <button v-if="chosenSouls.length > 0" class="btn">{{ $t('save_*', {item:  $t('client') }) }}</button>
        
    </form>
    
</template>

<script>
import InputNumber from "@/elements/InputNumber.vue"
import InputText from "@/elements/InputText.vue"
import SoulNumbersList from "@/components/SoulNumbersList.vue"

export default {
    name: "SoulMap",

    data(){
        return {
            souls: [],
            chosenSoulNumbers: {
                soul: 1,
                monada: 2,
                ego: 3,
                emotional_body: 4,
                mental_body: 5, 
                physical_body: 6,
                genetic_body: 7
            },
            chosenSouls: [],

            client: {
                name: "",
                date: "",
                dateOfBirth: "",
            },
        }
    },

    props: ['colors', 'soulGroupNamesByLang'],

    computed: {
        entries() {
            return Object.entries(this.chosenSoulNumbers).map(([key, value], index) => ({key, value, index}));
        }
    },

    created() {
        this.fetchSouls();
    },

    methods: {
        fetchSouls(){
            this.$axios.get('/soulmap/souls')
            .then(({data}) => {
                this.souls = data.souls;
            })

        },

        showSoulsText(){
            this.chosenSouls = Object.entries(this.chosenSoulNumbers).map(([group_name, chosen_num]) => {
                let soulGroup = this.souls.find(soulGroup => soulGroup.group_name == group_name).records;
                return soulGroup.find(soulObj => soulObj.number == chosen_num);
            })
        },

        saveClient() {
            this.$axios.post('/soulmap/saveClient', {
                client: this.client, 
                souls: this.chosenSouls,
            })
        },


    },

    components: {
        InputNumber,
        InputText,
        SoulNumbersList
    }

}


</script>

<style scoped>

.content {
    gap: var(--margin-xxl);
    padding: calc(2*var(--navbar-height)) 20px;
}

form {
    width: 100%;
}

.client-info {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--margin-l) var(--margin-xxl);

    width: 70%;
}

.soul-choose-numbers {
    flex-shrink: 1;
    display: grid;
    grid-template-rows: repeat(4, 1fr);
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--margin-xl) var(--margin-l);
    width: min(70%, 510px);

    div {
        place-self: center center;
    }
}


@media (min-width: 768px) {
    .center {
        grid-column: 2;
    }

}





</style>
