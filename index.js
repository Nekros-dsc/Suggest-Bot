const { Client, resolveColor } = require("discord.js"),
    { readFileSync, writeFileSync } = require("fs"),
    database = JSON.parse(readFileSync("./data.db")),
    { token, owners } = require("./config"),
    client = new Client({
        intents: 3276799
    });

function writeDatabase() {
    writeFileSync("./data.db", JSON.stringify(database))
}

client.login(token);

client.on("ready", () => {
    console.log(`Bot suggestions connecté en tant que ${client.user.tag} !\nPowered by Nova World!`);

    client.application.commands.set([
        {
            name: "suggest",
            description: "Suggérer une idée pour le serveur !",
            options: [
                {
                    name: "image",
                    description: "Ajouter une image",
                    type: 11
                }
            ]
        },
        {
            name: "setchannel",
            description: "Définir le salon de suggestions",
            options: [
                {
                    name: "channel",
                    description: "Le salon de suggestions",
                    type: 7,
                    required: true
                }
            ]
        }
    ])
});


client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (!database.guilds) database.guilds = {}
    const guildData = database.guilds[interaction.guildId];
    if (interaction.commandName === "suggest") {
        if (!guildData) return interaction.reply({
            content: "Zut, il semblerai que le salon de suggestions n'ai pas été défini !",
            ephemeral: true
        });
        let modal = {
            title: "Suggestion",
            custom_id: "suggest-modal",
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            style: 1,
                            label: "Titre",
                            custom_id: "title",
                            placeholder: "Titre de la suggestion",
                            required: true,
                            max_length: 30
                        }
                    ]
                },
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            style: 2,
                            label: "Description",
                            custom_id: "description",
                            placeholder: "Description de la suggestion",
                            min_length: 10,
                            required: true
                        }
                    ]
                }
            ]
        }

        await interaction.showModal(modal);
        const response = await interaction.awaitModalSubmit({ time: 120000 });
        if (!response) return;
        const title = response.fields.getTextInputValue("title"),
            description = response.fields.getTextInputValue("description");
        let embed = {
            title,
            description,
            color: resolveColor("Red"),
            author: { name: interaction.user.tag, icon_url: interaction.user.displayAvatarURL({ dynamic: true }) },
        };

        if (interaction.options.getAttachment("image")) embed.image = { url: interaction.options.getAttachment("image").url };
        await response.deferReply({ fetchReply: true, ephemeral: true });
        interaction.guild.channels.cache.get(guildData).send({ embeds: [embed] }).then((message) => {
            message.react("✅");
            message.react("❌");
            response.editReply({ content: `Votre [suggestion](https://discord.com/channels/${interaction.guildId}/${guildData}/${message.id}) a bien été envoyée !`, ephemeral: true });
        }).catch((e) => {
            response.editReply({ content: `Zut! Une erreur est survenue lors de l'envoi de votre suggestion !`, ephemeral: true });
        })

    } else if (interaction.commandName === "setchannel") {
        if (!owners.includes(interaction.user.id)) return interaction.reply({
            content: "Zut, vous n'avez pas la permission d'utiliser cette commande !",
            ephemeral: true
        });
        const channel = interaction.options.getChannel("channel");
        if (![5, 4, 0].includes(channel.type)) return;
        database.guilds[interaction.guildId] = channel.id;
        writeDatabase();
        interaction.reply({
            content: "Le salon de suggestions a bien été défini !",
            ephemeral: true
        })
    }
});