module.exports = function (discordClient) {
    global.discord.sendFile = function (channelID, fileData, fileName) {
        discordClient.channels.get(channelID).send("", {
            files: [{
                attachment: fileData,
                name: fileName
            }]
        });
    }
}
