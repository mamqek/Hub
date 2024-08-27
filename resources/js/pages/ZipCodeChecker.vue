<template>
    <div class="content" :style="addresses ? 'align-items: start;' : ''">
        
        <form @submit.prevent="checkZipCode">
            <h1>{{ $t('zip_code_checker') }}</h1>
            <p>{{ $t('example') }}</p>
            <InputText
                v-model="zipCode"
                id="zip-code"
                :label="`${$t('zip_code')}:`"
                required
            />

            <InputText
                v-model="houseNumber"
                id="house-letter"
                :label="`${$t('house_number')}:`"
                required
            />

            <InputText
                v-model="houseLetter"
                id="house-letter"
                :label="`${$t('house_letter')}:`"
            />

            <Checkbox
                v-model="exactMatch"
                name="exact-match"
                :text="$t('exact_match')"
            />
            
            <button class="btn" type="submit">{{ $t('find_buiding') }}</button>
        </form>
        
        <KadasterResponseBox v-for="(data, name) in addresses"
            :key="name"
            :name="'Found address' + (multipleAddresses ? '#'+name : '')"
            :data="data" 
        > 
            <button v-if="multipleAddresses" 
                class="btn" 
                @click="chooseAddress(name)"
            > 
                {{ $t('choose_building') }} 
            </button>
            <LinksButtons v-else
                :links="data.links"
                :alreadyFetched="alreadyFetched"
                @send-link="sendLink"
            />
        </KadasterResponseBox>


        <KadasterResponseBox v-for="(data, name) in responses"
            :key="name"
            :name="name"
            :data="data"
        >

            <LinksButtons 
                :links="data.links"
                :alreadyFetched="alreadyFetched"
                @send-link="sendLink"
            />  
            
        </KadasterResponseBox>
    </div>



</template>

<script>

import KadasterResponseBox from "@/components/KadasterResponseBox.vue";
import LinksButtons from "@/components/LinksButtons.vue"
import InputText from "@/elements/InputText.vue"
import Checkbox from "@/elements/Checkbox.vue"



export default {
    name: 'Zip code checker',

    data() {
        return {
            APIBaseUrl : "https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2/",

            zipCode: "",
            houseNumber: "",
            houseLetter: "",
            exactMatch: false,

            addresses: null,
            addressRecords : [],
            multipleAddresses: false,

            responses: {},
            alreadyFetched: new Set(),
            
        };
    },

    components: {
        KadasterResponseBox,
        LinksButtons,
        InputText,
        Checkbox
    },

    methods: {

        checkZipCode() {
            this.$axios.post('/check-zip-code', { 
                postcode : this.zipCode, 
                huisnummer : this.houseNumber, 
                huisletter : this.houseLetter,
                exactMatch : this.exactMatch,
            })
            .then(({ data }) => {
                this.responses = {};
                this.alreadyFetched.clear();

                this.addressRecords = data.addressRecords;
                this.addresses = data.data._embedded.adressen.map( address => {
                    let links = address._links;
                    delete address._links;
                    return {data : address, links : links};
                })
                this.multipleAddresses = this.addresses.length > 1;
            })
        },

        chooseAddress(chosenAddressNumber){
            let chosenAddress = this.addresses[chosenAddressNumber];
            this.addresses = this.addresses.filter(address => address === chosenAddress);
            this.addressRecords = this.addressRecords.filter(addressRecord => 
                this.addresses[0].nummeraanduidingIdentificatie == addressRecord.nummeraanduidingIdentificatie);
        },

        sendLink(name, link) {
            var endpoint = link.slice(this.APIBaseUrl.length);

            this.$axios.post(`/link`, { 
                endpoint : endpoint,
                addressRecordId : this.addressRecords[0].id
            })
            .then(({ data }) => {
                this.extractResponse(name, data)
            })
        },

        extractResponse(name, response) {
            var key = Object.keys(response.data)[0];

            const newKey = name === key 
            ? key 
            : (this.alreadyFetched.has(key))
            ? (() => {
                    let existingKey = Object.keys(this.responses).find(dataKey => dataKey.includes(key));
                    delete this.responses[existingKey]
                    return `${existingKey}/${name}`
                })()
            : `${key}/${name}`;

            const {[key] : data, _links : links} = response.data;
            this.responses[newKey] = {data: data, links: links};
            this.alreadyFetched.add(name);
            this.alreadyFetched.add(key);
        },

    }
}
</script>

<style scoped>

form { 
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;

    button {
        width: 300px;
    }
}

.content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    place-items: center center;

    /* grid-auto-rows: min(100%, 100vh); */

    gap: 30px var(--div-gap);
    padding-left: 50px; 
    padding-right: 50px;
}

.content .box .text p{ 
    /* height: min(100%, 100vh) */
    overflow-wrap:normal;
}

.data-boxes {
    display: flex;
    gap: var(--div-gap);
    flex-wrap: wrap;
    width: 100%;
}



</style>