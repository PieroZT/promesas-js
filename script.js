const $ = (selector) => document.querySelector(selector);

async function getJSON(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error("No se pudo conectar con la API. Revisa tu conexión e inténtalo otra vez.");
  }
  if (!response.ok) {
    if (response.status === 404) throw new Error("No se encontró ningún resultado con ese ID o nombre.");
    throw new Error(`La API respondió con el estado ${response.status}. Inténtalo nuevamente.`);
  }
  return response.json();
}

function showStatus(target, message, type = "loading") {
  target.innerHTML = "";
  const p = document.createElement("p");
  p.className = `status ${type}`;
  p.textContent = message;
  target.appendChild(p);
}

function showFields(target, fields) {
  target.innerHTML = "";
  const dl = document.createElement("dl");
  dl.className = "data-list";
  for (const [label, value] of fields) {
    const wrap = document.createElement("div");
    wrap.className = "data-item";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value === null || value === undefined || value === "" ? "No disponible" : String(value);
    wrap.append(dt, dd);
    dl.appendChild(wrap);
  }
  target.appendChild(dl);
}

function showCharacter(target, name, description, imageUrl, altText = name) {
  target.innerHTML = "";
  const article = document.createElement("article");
  article.className = "character";
  const img = document.createElement("img");
  img.src = imageUrl || "";
  img.alt = altText;
  img.loading = "lazy";
  img.onerror = () => { img.hidden = true; };
  const body = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = name || "Sin nombre";
  const p = document.createElement("p");
  p.textContent = description || "La API no proporciona una descripción para este personaje.";
  body.append(title, p);
  article.append(img, body);
  target.appendChild(article);
}

function showPokemon(target, pokemon) {
  target.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "pokemon-view";
  const img = document.createElement("img");
  img.src = pokemon.sprites?.other?.["official-artwork"]?.front_default || pokemon.sprites?.front_default || "";
  img.alt = pokemon.name;
  img.onerror = () => { img.hidden = true; };
  const title = document.createElement("h3");
  title.textContent = pokemon.name;
  wrap.append(img, title);
  target.appendChild(wrap);
  showFields(target, [
    ["ID", pokemon.id],
    ["Experiencia base", pokemon.base_experience],
    ["Altura", `${pokemon.height} decímetros`],
    ["Peso", `${pokemon.weight} hectogramos`],
    ["Tipos", pokemon.types.map(t => t.type.name).join(", ")]
  ]);
  target.prepend(wrap);
}

function readPositiveId(form) {
  const value = form.querySelector("input").value.trim();
  if (!value || !/^[1-9]\d*$/.test(value)) {
    throw new Error("Ingresa un ID entero mayor que cero.");
  }
  return value;
}

async function runSearch(form, button, target, task) {
  button.disabled = true;
  showStatus(target, "Consultando la API…", "loading");
  try {
    await task();
  } catch (error) {
    showStatus(target, error.message || "Ocurrió un error. Verifica tu conexión e inténtalo de nuevo.", "error");
  } finally {
    button.disabled = false;
  }
}

document.querySelectorAll("form[data-form]").forEach(form => {
  form.addEventListener("submit", event => {
    event.preventDefault();
    const button = form.querySelector("button");
    const kind = form.dataset.form;
    const target = document.getElementById(`${kind}-result`);

    runSearch(form, button, target, async () => {
      if (kind === "planet") {
        const id = readPositiveId(form);
        const data = await getJSON(`https://swapi.dev/api/planets/${id}/`);
        showFields(target, [
          ["Nombre", data.name], ["Clima", data.climate], ["Terreno", data.terrain],
          ["Población", data.population], ["Gravedad", data.gravity]
        ]);
      } else if (kind === "starship") {
        const id = readPositiveId(form);
        const data = await getJSON(`https://swapi.dev/api/starships/${id}/`);
        showFields(target, [
          ["Nombre", data.name], ["Modelo", data.model], ["Fabricante", data.manufacturer],
          ["Costo", data.cost_in_credits === "unknown" ? "Desconocido" : `${data.cost_in_credits} créditos`],
          ["Velocidad máxima", data.max_atmosphering_speed]
        ]);
      } else if (kind === "dragonball") {
        const id = readPositiveId(form);
        const data = await getJSON(`https://dragonball-api.com/api/characters/${id}`);
        const character = data.items ? data.items[0] : data;
        if (!character || !character.name) throw new Error("No se encontró el personaje solicitado.");
        showCharacter(target, character.name, character.description, character.image);
      } else if (kind === "pokemon") {
        const query = form.querySelector("input").value.trim().toLowerCase();
        if (!query || !/^[a-z0-9-]+$/.test(query)) {
          throw new Error("Escribe un ID o nombre Pokémon válido.");
        }
        const data = await getJSON(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(query)}/`);
        showPokemon(target, data);
      }
    });
  });
});
