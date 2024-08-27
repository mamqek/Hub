<template>
    <div class="inputBox">
        <input 
            :type="type" 
            :id="id" 
            :class="{ 'has-value' : modelValue.length > 0}"
            :value="modelValue" 
            @input="$emit('update:modelValue', $event.target.value)" 
            :required="required"
        >
        <label :for="id">{{ label }}</label>
    </div>
</template>

<script>

export default {
    name: "Input Text", 
    props: {
        modelValue: {
            type: String,
            required: true
        },
        label: {
            type: String,
            default: 'Default label'
        },
        type: {
            type: String,
            default: 'text'
        },
        id: {
            type: String,
            required: true
        },
        required: {
            type: Boolean,
            default: false
        }
    }
};

</script>


<style>

.inputBox{
    position: relative;
    width: 300px;
    margin-bottom: 40px;
}

input[type="date"]:in-range::-webkit-datetime-edit-year-field,
input[type="date"]:in-range::-webkit-datetime-edit-month-field,
input[type="date"]:in-range::-webkit-datetime-edit-day-field,
input[type="date"]:in-range::-webkit-datetime-edit-text {
    color: transparent;
    pointer-events: none;
}

.inputBox input{
    position: relative;
    width: 100%;
    padding: 10px 0;
    border: none;
    outline: none;
    background: transparent;
    border-bottom: 2px solid var(--dark-grey-color);
    color: var(--dark-color);
    font-size: 1em;
    text-transform: uppercase;
    /* letter-spacing: 0.15em; */
}

.inputBox label{
    position: absolute;
    left: 0;
    padding: 10px 0;
    pointer-events: none;
    color: var(--dark-grey-color);
    text-transform: uppercase;

    letter-spacing: 0.05em;
    transition: 0.2s ease-in-out;
}

.inputBox input:focus,
.inputBox input.has-value{
    border-bottom: 2px solid var(--dark-color);
}

.inputBox input:focus ~ label,
.inputBox input.has-value ~ label{
    color: var(--dark-color);
    letter-spacing: 0.2em;
    transform: translateY(-25px);
}

input:-webkit-autofill, 
input:-webkit-autofill:hover, 
input:-webkit-autofill:focus, 
input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0px 1000px transparent inset !important;
    box-shadow: 0 0 0px 1000px transparent inset !important;
    background-color: transparent !important;
    color: inherit !important;
}


/* .inputBox input:focus,
.inputBox input:valid{
    border-bottom: 2px solid #000;
}

.inputBox input:focus ~ label,
.inputBox input:valid ~ label{
    color: #000;
    letter-spacing: 0.2em;
    transform: translateY(-25px);
} */

</style>