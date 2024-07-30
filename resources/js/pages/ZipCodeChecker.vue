<template>
    <h1>Zip code</h1>

    <form>
        <label for="zip-code">Zip code:</label>
        <input type="text" id="zip-code" name="zip-code" required>
        <button type="submit">Check</button>
    </form>

</template>

<script>
export default {
    name: 'Zip code checker',
}
</script>