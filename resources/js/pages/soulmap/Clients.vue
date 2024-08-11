<template>

    <div class="content">

        <table class="table">
            <thead>
                <tr>
                    <th v-for="(column, index) in columnsRus" :key="column" :colspan="index == 4 ? 7 : 1" :rowspan="index != 4 ? 2 : 1">
                        {{ column }}
                    </th>
                </tr>
                <tr>
                    <th v-for="(soulGroupName, index) in soulGroupNamesRus">
                        {{ soulGroupName }}
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(client, index) in clients" @click="showClient(client)" class="pressable">
                    <template v-for="(value, key) in client">
                        <td v-if="key == 'souls'" v-for="(soulObj, index) in value">
                            {{ soulObj.number }}
                        </td>
                        <td v-else-if="key != 'created_at' && key != 'updated_at'">
                            {{ value }}
                        </td>
                    </template>
                </tr>
            </tbody>
        </table>

         <div v-if="showedClient">
            <div class="client">
                <p class="info" data-label="Имя">{{ showedClient.name }}</p>
                <p class="info" data-label="Дата">{{ showedClient.date }}</p>
                <p class="info" data-label="Дата рождения">{{ showedClient.date_of_birth }}</p>
            </div>

            <SoulNumbersList 
                 :objArr="showedClient.souls"
                 :colors="colors"
                 :headers="soulGroupNamesRus"
             />
         </div>

    </div>

    
    


</template>

<script>
import SoulNumbersList from "@/components/SoulNumbersList.vue"

export default {

    data(){
        return {
            clients: [],
            columnsRus: ["#","Имя", "Дата", "Дата рождения", "Числа души"],
            columns: ["Id", "Name", "Date", "Date of birth", "Soul numbers"],
            showedClient: null,
        }
    },

    created(){
        this.fetchClients();
    },

    props: ["soulGroupNamesRus", "colors"],

    components:{
        SoulNumbersList
    },

    methods: {
        fetchClients() {
            this.$axios.get('/soulmap/clients')
            .then(({data}) => {
                console.log(data);
                this.clients = data;
                console.log(this.columns)
            })
        },

        showClient(client){
            console.log("show")
            this.showedClient = client;
        }
    }

}
</script>

<style scoped>

.content {
    padding: 0 80px;
    gap: 50px;
}

.client {
    display: flex;
    justify-content: center;
    gap: 30px;
    padding-bottom: 30px;
}


.table {
	width: 100%;
	border: none;
	margin-bottom: 20px;
    border-collapse: separate;
    border-spacing: 0 1px;
    background-color: inherit;
}


.table thead th {
	font-weight: bold;
	text-align: left;
	border: none;
	padding: 10px 15px;
	background: var(--medium-grey-color);
	font-size: 14px;
}

/* Rounded thead */
.table thead tr:first-child th:first-child {
	border-radius: 8px 0 0 8px;
}

.table thead tr:first-child th:last-child {
	border-radius: 0 8px 0 0;
}

.table thead tr:last-child th:last-child {
	border-radius: 0 0 8px 0;
}


.table tbody td {
	text-align: left;
	border: none;
	padding: 10px 15px;
	font-size: 14px;
	vertical-align: top;
    white-space: nowrap;
}

/* Apply min-width to ensure the column is at least as wide as its content */
 .table tbody td {
	min-width: fit-content;
}

.table tbody tr > *{
    background: var(--light-grey-color);
}
.table tbody tr:nth-child(even) > *{
	background: var(--primary-color);
}

.table tbody tr td:first-child {
	border-radius: 8px 0 0 8px;
}
.table tbody tr td:last-child {
	border-radius: 0 8px 8px 0;
}






</style>
