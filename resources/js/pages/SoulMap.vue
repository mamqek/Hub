<template>

    <div class="content">

        <div class="client-info">

            <InputText
                v-model="client.name"
                id="name"
                label="Имя:"
                required
            />
            <InputText
                v-model="client.date"
                type="date"
                id="date"
                label="Дата:"
                required
            />
            <InputText
                v-model="client.dateOfBirth"
                type="date"
                id="date_of_birth"
                label="Дата рождения:"
                required
            />

        </div>

        <form @submit.prevent="showSoulsText" class="soul-numbers">

            <InputNumber v-for="(entry, index) in entries" :key="entry.key"
                v-model="chosenSoulNums[entry.key]"
                :max="7"
                :min="1"
                :id="`${entry.key}-num`"
                :label="rusSoulGroupNames[index]"
                :class="index == 6 ? 'center' : ''" 
                :style="`background-color: ${colors[chosenSoulNums[entry.key]-1]};`"
            />

            <button type="submit" class="btn center">Submit</button>
        
        </form>

        <div class="soul-texts" v-if="chosenSouls.length >0 ">
            <div class="text" v-for="(soul, index) in chosenSouls" >
                <h2 v-html="splitTextByWords(rusSoulGroupNames[index])" :style="`background-color: ${colors[soul.number-1]};`"></h2>
                <p> {{ soul.text }} </p>
            </div>
            <button type="button" @click="saveClient" class="btn">Сохранить клиента и числа</button>
        </div>

    </div>
    
</template>

<script>
import InputNumber from "@/elements/InputNumber.vue"
import InputText from "@/elements/InputText.vue"

export default {
    name: "SoulMap",

    data(){
        return {
            souls: [],
            chosenSoulNums: {
                soul: 1,
                monada: 2,
                ego: 3,
                emotional_body: 4,
                mental_body: 5, 
                physical_body: 6,
                genetic_body: 7
            },
            chosenSouls: [],


            rusSoulGroupNames: ["Душа", "Монада", "Эго", "Эмоциональное тело", "Ментальное тело", "Физическое тело", "Генетическое тело"],
            colors: ["red", "#2200ff", "yellow", "green", "orange", "pink", "#54067d"],

            client: {
                name: "",
                date: "",
                dateOfBirth: "",
            },
        }
    },

    computed: {
        entries() {
            return Object.entries(this.chosenSoulNums).map(([key, value], index) => ({key, value, index}));
        }
    },

    created() {
        this.fetchSouls();
    },

    methods: {
        fetchSouls(){
            this.$axios.get('/souls')
            .then(({data}) => {
                this.souls = data.souls;
            })
            .catch(error => {
                console.log(error)
            });

        },

        showSoulsText(){
            this.chosenSouls = Object.entries(this.chosenSoulNums).map(([group_name, chosen_num]) => {
                let soulGroup = this.souls.find(soulGroup => soulGroup.group_name == group_name).records;
                return soulGroup.find(soulObj => soulObj.number == chosen_num);
            })
        },

        saveClient() {
            this.$axios.post('/saveClient', {
                client: this.client, 
                souls: this.chosenSouls,
            })
            .then(({data}) => {
                console.log(data);
            })
            .catch(error => {
                console.log(error)
            });
        },

        splitTextByWords(text){
            return text.split(' ').join('<br/>');
        }
    },

    components: {
        InputNumber,
        InputText
    }

}


</script>

<style scoped>

.content {
    gap: 30px;
}

.client-info {
    display: flex;
    gap: 30px;

    max-width: 70%;
}

.soul-numbers {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 30px;

    .center {
        grid-column: 2 / 3;
    }
}

.soul-texts {
    padding: 50px 100px;
    display: flex;
    flex-direction: column;
    gap: 30px;
    
    
    .text {
        display: flex;
        background-color: var(--light-grey-color);
        border-radius: var(--border-radius-md);
        overflow: hidden;
        
        h2 {
            writing-mode: vertical-rl;
            line-height: 0.8;
            min-width: 60px;
            padding: 5px;
            padding-left: 0;
        }

        p{
            padding: 15px;
        }

    }
}




</style>
