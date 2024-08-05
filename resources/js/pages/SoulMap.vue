<template>

    <div class="content">
        
    </div>
    
</template>

<script>
export default {
    name: "SoulMap",

    methods: {
        fetchSouls(){
            this.$axios.get('/souls')
            .then(({ data }) => {
                console.log(data);
                

            })
        }
    }

}
</script>

<!-- <script>
	export let name;

	// const emotionalBodyElement = {
	// 	"ДУША": SOUL,
	// 	"МОНАДА": MONADA,
	// 	"ЭГО": EGO,
	// 	"ЭМОЦИОНАЛЬНОЕ ТЕЛО": EMOTIONAL_BODY,
	// 	"МЕНТАЛЬНОЕ ТЕЛО": MENTAL_BODY,
	// 	"ФИЗИЧЕСКОЕ ТЕЛО": PHYSICAL_BODY,
	// 	"ГЕНЕТИЧЕСКОЕ ТЕЛО": GENETIC_BODY,
	// };

	let numbers = [1, 2, 3, 4, 5, 6, 7];
	let colors = ["red", "blue", "yellow", "green", "orange", "pink", "purple"];
	let description = [];
	let names = [];

	function handleNumberChange(index, event, name, arr) {
		names[index] = name;
		description[index] = arr[event.target.value];
	}

</script>

<main>

	<div class="customerInfo">
		<div>
			<label for="name">Имя:</label>
			<input type="text" name="name">
		</div>

		<div>
			<label for="date">Дата:</label>
			<input type="date" name="date">
		</div>

		<div>
			<label for="birthDate">Дата рождения:</label>
			<input type="date" name="birthDate">
		</div>	
	</div>

	<div class="grid">
	
		{#each Object.entries(emotionalBodyElement) as [name, value], index}
			<div class="input">
				<label for="number-{index}"> {name}:</label>
				<input
					type="number"
					id="number-{index}"
					min="1"
					max="7"
					on:input={(event) => handleNumberChange(index, event, name, value)} 
                />
			</div>
			<div class="text">
				<h3>{names[index] ?? name}</h3>
				<p>{description[index] ?? ""}</p>
			</div>
			
		{/each}

	</div>

</main>

<style>
	main {
		width: 100%;
		box-sizing: border-box; /* Include padding and border in element's total width and height */
		padding: 0 20px	;
		background-color: antiquewhite;
	}
	.grid {
		display: grid;
		grid-template-columns: 2fr 8fr; /* Two columns */
		grid-template-rows: repeat(8, 1fr); /* Seven rows */
		row-gap: 10px; /* Space between grid items */
		column-gap: 30px; /* Space between grid items */
	}

	.customerInfo {
		display: flex;
		flex-direction: row;
		justify-content: space-evenly;
	}

	.text {
		margin-left: 40px;
		flex: 1;
	}


	label {
		display: block;
		margin-bottom: 0.5em;
	}


	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style> -->