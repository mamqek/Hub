<template>
    <div class="soul-texts" >
        <div class="text" v-for="(item, index) in objArr" >
            <h2 v-html="splitTextByWords(headers[index])" :style="`background-color: ${colors[item.number-1]};`"></h2>
            <p> {{ item.text }} </p>
        </div>
    </div>
</template>

<script>

export default {
    props: {
        objArr:{
            type: Array,
            required: true,
            validator(value) {
                // Check if every item in the array is a valid object
                const isValid = value.every(item => {
                    return item && typeof item === 'object' &&
                        'text' in item && typeof item.text === 'string' &&
                        'number' in item && typeof item.number === 'number';
                });

                // If the validation fails, Vue will output a warning
                if (!isValid) {
                    console.warn('Invalid prop: `items` should be an array of objects with `id`, `name`, and `age` properties.');
                }

                // Return true if the structure is valid, otherwise false
                return isValid;
            }
        },
        colors: {
            type: Array,
            default: ["inherit"]
        },
        headers: {
            type: Array, 
            required: true
        }
    },
    
    created() {
        if (this.colors.length == 1 && this.colors[0] == "inherit"){
            this.colors = Array(this.objArr.length).fill("inherit");
        }
    },

    methods: {
        splitTextByWords(text){
            return text.split(' ').join('<br/>');
        }
    }
}

</script>

<style scoped>

.soul-texts {
    padding: 0 100px;
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
            padding: 15px;
            padding-left: 0;
            padding-right: 5px;
        }

        p{
            padding: 15px;
        }

    }
}

</style>