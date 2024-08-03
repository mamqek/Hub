<template>
    <div class="primary-checkbox" 
        @click="$emit('update:modelValue', !modelValue)" 
        @keydown.enter="$emit('update:modelValue', !modelValue)" 
        @keydown.space.prevent="$emit('update:modelValue', !modelValue)" 
        tabindex="0"
    >
        <input type="checkbox" 
            :name="name" 
            class="primary-checkbox-input" 
            :checked="modelValue" 
            @change="$emit('update:modelValue', $event.target.checked)"  
            :disabled="disabled"
        >
        <span class="primary-checkbox-box"></span>
        <span class="primary-checkbox-text">{{ text }}</span>
        <br>
    </div>
</template>

<script>
    export default {
        name : "Checkbox",

        props: {
            modelValue: {
                type: Boolean,
                required: true
            },

            text: {
                type: String, 
                default: "Default text"
            },

            disabled: {
                type : Boolean, 
                default : false
            }, 
            
            name: {
                type: String, 
                required: true
            }
        },
    }
</script>

<style>

/* Hide the default checkbox */
.primary-checkbox-input {
    display: none;
}

/* Style the custom checkbox container */
.primary-checkbox {
    /* display: inline-block; */
    cursor: pointer;
    position: relative;
    padding-left: calc(25px + 5px);
    padding-right: 5px;
    font-size: 20px;
    user-select: none;
    width: fit-content;
}

/* Create the custom checkbox appearance */
.primary-checkbox-box {
    position: absolute;
    transform: translate(-120%, 25%);
    width: 20px;
    height: 20px;
    border: 2px solid var(--dark-grey-color);
    border-radius: 4px;
    background-color: transparent;
    transition: background-color 0.2s, border-color 0.2s;
}

.primary-checkbox-text {
    margin-left: 10px;
    font-size: 20px;
    color: var(--dark-grey-color);
}

/* Create the check mark when checked */
.primary-checkbox-input:checked+.primary-checkbox-box::after {
    content: '\2713';
    /* Unicode character for check mark */
    position: absolute;
    top: -3px;
    left: 2px;
    font-size: 18px;
    color: var(--dark-color);
    font-weight: 700;
}
/* + - only next sibling */
.primary-checkbox-input:checked+.primary-checkbox-box {
    background-color: inherit;
    border-color: var(--dark-color);
}

/* ~ - any following sibling */
.primary-checkbox-input:checked~.primary-checkbox-text {
    color: var(--dark-color);
}

</style>