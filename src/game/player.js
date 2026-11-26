//
// Traitors Player
//

// A seat in a round. The seat keeps its id when a newcomer replaces the
// party member sitting in it.
export function Player(name, partyId, id) {
    return {
        name,
        partyId,
        id,
        isConnected: true,
        isTraitor: false,
        isCaptain: false,
        hasBeenCaptain: false,
    };
}

Player.getJson = function (player, showRole) {
    var json = {
        name: player.name,
        id: player.id,
        isConnected: player.isConnected,
        isCaptain: player.isCaptain,
        hasBeenCaptain: player.hasBeenCaptain,
    };
    if (player.isBot) json.isBot = true;
    if (showRole) json.isTraitor = player.isTraitor;
    return json;
};

Player.replaceConnection = function (player, partyPlayer) {
    player.partyId = partyPlayer.id;
    player.name = partyPlayer.name;
    player.isConnected = true;
};
