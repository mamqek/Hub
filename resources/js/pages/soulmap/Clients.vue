<template>

    <div class="content">
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr class="toolbar">
                        <th colspan="11" style="border-bottom: 2px solid var(--dark-color);">
                            <div class="search-container">
                                <input v-model="search" class="search-bar" type="text">
                            </div>
                        </th>
                    </tr>
                    <tr>
                        <template v-for="(column, index) in columnsByLang" :key="column">
                            <th v-if="index==4" colspan="7" style="border-bottom: 2px solid var(--dark-color);">
                                {{ column }}
                            </th>
                            <th v-else  rowspan="2">
                                {{ column }}
                            </th>
                        </template>
                    </tr>
                    <tr>
                        <th v-for="(soulGroupName, index) in soulGroupNamesByLang">
                            {{ soulGroupName }}
                        </th>
                    </tr>
                </thead>
                <tr class="spacing"></tr>
                <tbody>
                    <tr v-for="(client, index) in searched" @click="showClient(client)" class="pressable">
                        <template v-for="(key, index) in Object.keys(client).filter(k => k !== 'created_at' && k !== 'updated_at')">
                            <td v-if="key == 'souls'" v-for="(soulObj, sIndex) in client[key]" :data-label="soulGroupNamesByLang[sIndex]">
                                {{ soulObj.number }}
                            </td>
                            <td v-else :data-label="columnsByLang[index]">
                                {{ client[key] }}
                            </td>
                        </template>
                    </tr>
                </tbody>
            </table>
            <div v-if="noDataToDisplay" class="no-data">
                <h2>No data found</h2>
            </div>
        </div>
        
        <div v-if="showedClient">
            <div class="client">
                <p class="info" :data-label="$t('name')">{{ showedClient.name }}</p>
                <p class="info" :data-label="$t('date')">{{ showedClient.date }}</p>
                <p class="info" :data-label="$t('date_of_birth')">{{ showedClient.date_of_birth }}</p>
            </div>

            <SoulNumbersList 
                 :objArr="showedClient.souls"
                 :colors="colors"
                 :headers="soulGroupNamesByLang"
             />
         </div>

</div>

    
    


</template>

<script>
import SoulNumbersList from "@/components/SoulNumbersList.vue"
import i18n from "@/lang.js"

export default {

    data(){
        return {
            search: "",
            clients: [],
            columns_ru: ["#","Имя", "Дата", "Дата рождения", "Числа души"],
            columns_en: ["Id", "Name", "Date", "Date of birth", "Soul numbers"],
            showedClient: null,
        }
    },

    created(){
        this.fetchClients();
    },

    props: ["soulGroupNamesByLang", "colors"],

    components:{
        SoulNumbersList
    },

    methods: {
        fetchClients() {
            this.$axios.get('/soulmap/clients')
            .then(({data}) => {
                this.clients = data;
            })
        },

        showClient(client){
            this.showedClient = client;
        },

    },

    computed: {

        searched() {
            if (typeof this.search !== 'string') {
                return [];
            }

            return this.clients.filter(client =>
                client.name.toLowerCase().includes(this.search.toLowerCase()))
        },

        noDataToDisplay() {
            return !(this.searched.length > 0)
        },

        columnsByLang() {
            return this[`columns_${i18n.global.locale}`];
        }


    },

}
</script>

<style scoped>


.toolbar {
    .search-container {
        position: relative;
    }
    .search-container::before {
        position: absolute;
        transform: translate(50%, 30%);
        content: "\f002"; /* Unicode for the user icon */
        color: var(--dark-color);
        font-family: "Font Awesome 6 Free"; /* Set the font family to Font Awesome */
        font-weight: 900; /* Use 900 for solid icons, 400 for regular, etc. */
        margin-right: 5px; /* Optional: add space between icon and text */
    }
    .search-bar {
        width: 100%;
        border: none;
        border-radius: var(--border-radius-md);
        height: 32px;
        padding: 0 0 0 30px;
    }

    .search-bar:focus{
        outline: solid var(--dark-color) 2px ;
    }
}

.content {
    overflow-x: auto;
    gap: 50px;
    height: 100%;
    padding: calc(2*var(--navbar-height)) 20px;
}

.client {
    display: flex;
    justify-content: center;
    gap: 30px;
    padding-bottom: 30px;
}


.table {
	border: none;
    border-collapse: separate;
    border-spacing: 0;

    background-color: inherit;
}

.spacing {
    height: 10px;
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
	border-radius: 8px 8px 0 0;
}

.table thead tr:nth-child(2) th:first-child {
	border-radius: 0 0 0 8px;
}

/* .table thead tr:first-child th:last-child {
	border-radius: 0 8px 0 0;
} */

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

.table tbody tr {
    background: var(--light-grey-color);
}
.table tbody tr:nth-child(even) {
	background: var(--primary-color);
}

.table tbody tr td:first-child {
	border-radius: 8px 0 0 8px;
}
.table tbody tr td:last-child {
	border-radius: 0 8px 8px 0;
}

.no-data {
    background-color: var(--light-grey-color);
    border-radius: 8px;
    width: 100%;
    height: 41px;
    text-align: center;

    h2 {
        margin: auto 0 ;
    }

}





</style>
