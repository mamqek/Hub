<template>
    <div class="container-center">
        <h1>Zip code</h1>
    
        <form @submit.prevent="checkZipCode">
            <label for="zip-code">Zip code:</label>
            <input type="text" id="zip-code" v-model="zipCode" required>

            <label for="house-number">House number:</label>
            <input type="text" id="house-number" v-model="houseNumber" required>

            <label for="house-letter">House letter (optional):</label>
            <input type="text" id="house-letter" v-model="houseLetter">

            <button type="submit">Check</button>
        </form>
    </div>

</template>

<script>
export default {
    name: 'Zip code checker',

    data() {
        return {
            zipCode: null,
            houseNumber: null,
            houseLetter: null
        };
    },

    methods: {
        checkZipCode() {
            this.$axios.post('/check-zip-code', { 
                    postcode : this.zipCode, 
                    huisnummer : this.houseNumber, 
                    huisletter : this.houseLetter 
                })
                .then(({ data }) => {
                    console.log(data);
                })
                .catch(error => {
                    alert(error);
                });
        }
    }
}
</script>

<style scoped>

form { 
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

</style>