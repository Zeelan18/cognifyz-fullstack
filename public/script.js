async function loadUsers() {

    const response =
        await fetch('/api/users');

    const users =
        await response.json();

    const container =
        document.getElementById('apiUsers');

    if (!container) return;

    container.innerHTML = '';

    users.forEach(user => {

        container.innerHTML += `
            <div class="card mb-3 p-3">

                <h5>${user.name}</h5>

                <p>Email: ${user.email}</p>

                <p>Department: ${user.department}</p>

            </div>
        `;

    });

}
async function deleteUser(id) {

    await fetch('/api/users/' + id, {
        method: 'DELETE'
    });

    location.reload();
}
async function getWeather() {

    const city =
        document.getElementById('city').value;

    const result =
        document.getElementById('weatherResult');

    try {

        const response =
            await fetch(`/api/weather/${city}`);

        const data =
            await response.json();

        result.innerHTML = `
            <div class="alert alert-success">

                <h4>${data.city}</h4>

                <p>Temperature: ${data.temperature} °C</p>

                <p>Humidity: ${data.humidity}%</p>

                <p>Weather: ${data.weather}</p>

            </div>
        `;

    } catch (error) {

        result.innerHTML = `
            <div class="alert alert-danger">
                Failed to fetch weather.
            </div>
        `;

    }

}

window.onload = loadUsers;