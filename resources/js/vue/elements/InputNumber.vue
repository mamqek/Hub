<template>
    <div class="custom-number-input" @blur.capture="capture">
        <label>{{ label }}</label>
        <button type="button" @click="decrement" :disabled="belowMin">-</button>
        <input type="number" :id="id" :value="modelValue" @input="$emit('update:`modelValue`', $event.target.value)" :min="min" :max="max">
        <button type="button" @click="increment" :disabled="overMax" >+</button>
    </div>

</template>

<script>

export default {
    name: "Number input",

    props: {
        modelValue: {
            type: Number, 
            required: true
        },
        max: {
            type: Number, 
            default: 999
        },
        min: {
            type: Number, 
            default: 0
        },
        id: {
            type: String,
            required: true
        },
        label: {
            type: String,
        }
    },

    computed: {
        overMax(){
            return this.modelValue >= this.max;
        },
        belowMin(){
            return this.modelValue <= this.min;
        }
    },

    methods: {
        increment() {
            if (this.modelValue < this.max) {
                this.$emit('update:modelValue', this.modelValue + 1);
            }
        },
        decrement() {
            if (this.modelValue > this.min) {
                this.$emit('update:modelValue', this.modelValue - 1);
            }
        },
        updateValue(event) {
            const value = Number(event.target.value);
            this.$emit('update:modelValue', value);
        },
        capture() {
            // console.log("I capture event from all my children even though I am a div without events")
        }
    }

}
</script>


<style scoped>
    .custom-number-input {
        display: flex;
        align-items: center;
        background-color: var(--light-grey-color);
        /* border: 1px solid var(--light-grey-color); */
        border-radius: var(--border-radius-sm);
        width: fit-content;
        padding: 6px;
        height: 38px;
        

        position: relative;
        label {
            position: absolute;
            top: -25px;
            left: 0;
            text-align: center;
            width: 100%;
            text-wrap: nowrap;
        }
    }

    .custom-number-input input[type=number] {
        -moz-appearance: textfield;
        appearance: textfield;
        background: var(--light-grey-color);
        border: none;
        color: var(--dark-color);
        font-size: 16px;
        margin: 0 10px;
        text-align: center;
        border-radius: var(--border-radius-sm);
        width: 50px;
    }

    .custom-number-input input[type=number]::-webkit-outer-spin-button,
    .custom-number-input input[type=number]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    .custom-number-input button {
        aspect-ratio: 1 / 1;
        background: var(--medium-grey-color);
        border-radius: var(--border-radius-sm);
        border: none;
        color: var(--primary-color);
        cursor: pointer;
        font-size: 16px;
        font-weight: 800;
        height: 100%;
    }

    .custom-number-input button:focus {
        outline: none;
    }

    .custom-number-input button:disabled {
        background: var(--grey-color);
    }
</style>

