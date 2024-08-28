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
    padding-left: calc(1.25rem + var(--margin-xs));
    padding-right: 5px;
    font-size: 1.25rem;
    user-select: none;
    width: fit-content;
}

/* Create the custom checkbox appearance */
.primary-checkbox-box {
    position: absolute;
    transform: translate(-120%, 25%);
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid var(--dark-grey-color);
    border-radius: var(--border-radius-sm);
    background-color: transparent;
    transition: background-color 0.2s, border-color 0.2s;
}

.primary-checkbox-text {
    margin-left: var(--margin-xs);
    color: var(--dark-grey-color);
}

/* Create the check mark when checked */
.primary-checkbox-input:checked+.primary-checkbox-box::after {
    content: '\2713';
    /* Unicode character for check mark */
    position: absolute;
    top: calc(var(--margin-xxs) * -1 );
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