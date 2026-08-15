// ======================================================
// APL TOURNAMENT PLATFORM
// PURPLE CAP
// ======================================================

import { auth, db } from "../firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// ======================================================
// ELEMENTS
// ======================================================

const tournamentSelect =
    document.getElementById(
        "tournamentSelect"
    );

const purpleLeader =
    document.getElementById(
        "purpleLeader"
    );

const purpleCapList =
    document.getElementById(
        "purpleCapList"
    );


// ======================================================
// GLOBAL
// ======================================================

let currentUser = null;

let tournaments = [];

let selectedTournamentId = null;


// ======================================================
// START
// ======================================================

console.log(
    "🟣 PURPLE CAP JS STARTED"
);


// ======================================================
// AUTH
// ======================================================

onAuthStateChanged(
    auth,
    async (user) => {

        console.log(
            "Purple Cap Auth:",
            user
        );


        if (!user) {

            currentUser = null;


            showMessage(
                purpleCapList,
                "Please login first."
            );


            showMessage(
                purpleLeader,
                "Please login first."
            );


            if (tournamentSelect) {

                tournamentSelect.innerHTML = `
                    <option value="">
                        Please login first
                    </option>
                `;

            }


            return;
        }


        currentUser = user;


        await loadTournaments();

    }
);


// ======================================================
// LOAD TOURNAMENTS
// ======================================================

async function loadTournaments() {

    try {

        console.log(
            "Loading tournaments..."
        );


        const tournamentsRef =
            collection(
                db,
                "tournaments"
            );


        const q =
            query(
                tournamentsRef,
                where(
                    "ownerId",
                    "==",
                    currentUser.uid
                )
            );


        const snapshot =
            await getDocs(q);


        tournaments = [];


        snapshot.forEach(
            (doc) => {

                tournaments.push({

                    id: doc.id,

                    ...doc.data()

                });

            }
        );


        console.log(
            "Tournaments:",
            tournaments
        );


        renderTournamentSelect();


    } catch (error) {

        console.error(
            "Tournament loading error:",
            error
        );


        showMessage(
            purpleCapList,
            error.message
        );

    }

}


// ======================================================
// TOURNAMENT SELECT
// ======================================================

function renderTournamentSelect() {

    if (!tournamentSelect) {
        return;
    }


    tournamentSelect.innerHTML = "";


    if (tournaments.length === 0) {

        tournamentSelect.innerHTML = `
            <option value="">
                No tournaments found
            </option>
        `;


        showMessage(
            purpleCapList,
            "No tournament found."
        );


        showMessage(
            purpleLeader,
            "Create a tournament first."
        );


        return;
    }


    const firstOption =
        document.createElement(
            "option"
        );


    firstOption.value = "";

    firstOption.textContent =
        "Select Tournament";


    tournamentSelect.appendChild(
        firstOption
    );


    tournaments.forEach(
        (tournament) => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                tournament.id;


            option.textContent =
                tournament.tournamentName ||
                tournament.name ||
                "Tournament";


            tournamentSelect.appendChild(
                option
            );

        }
    );


    // ==========================================
    // RESTORE SAVED TOURNAMENT
    // ==========================================

    const savedId =
        localStorage.getItem(
            "selectedTournamentId"
        ) ||
        localStorage.getItem(
            "tournamentId"
        );


    if (
        savedId &&
        tournaments.some(
            t => t.id === savedId
        )
    ) {

        tournamentSelect.value =
            savedId;


        selectedTournamentId =
            savedId;


        loadPurpleCap(
            savedId
        );

    } else {

        showMessage(
            purpleCapList,
            "Select a tournament to view Purple Cap."
        );


        showMessage(
            purpleLeader,
            "Select a tournament."
        );

    }

}


// ======================================================
// TOURNAMENT CHANGE
// ======================================================

if (tournamentSelect) {

    tournamentSelect.addEventListener(
        "change",
        async () => {

            const id =
                tournamentSelect.value;


            if (!id) {

                selectedTournamentId =
                    null;


                showMessage(
                    purpleCapList,
                    "Select a tournament."
                );


                showMessage(
                    purpleLeader,
                    "Select a tournament."
                );


                return;
            }


            selectedTournamentId =
                id;


            localStorage.setItem(
                "tournamentId",
                id
            );


            localStorage.setItem(
                "selectedTournamentId",
                id
            );


            console.log(
                "Selected Tournament:",
                id
            );


            await loadPurpleCap(
                id
            );

        }
    );

}


// ======================================================
// LOAD PURPLE CAP
// ======================================================

async function loadPurpleCap(
    tournamentId
) {

    if (!tournamentId) {
        return;
    }


    console.log(
        "Loading Purple Cap:",
        tournamentId
    );


    showMessage(
        purpleLeader,
        "Loading..."
    );


    showMessage(
        purpleCapList,
        "Loading players..."
    );


    try {

        const players =
            await loadPlayers(
                tournamentId
            );


        console.log(
            "Players:",
            players
        );


        const matches =
            await loadMatches(
                tournamentId
            );


        console.log(
            "Matches:",
            matches
        );


        const wicketTakers =
            calculateWickets(
                players,
                matches
            );


        console.log(
            "Wicket Takers:",
            wicketTakers
        );


        renderPurpleLeader(
            wicketTakers
        );


        renderPurpleList(
            wicketTakers
        );


    } catch (error) {

        console.error(
            "Purple Cap error:",
            error
        );


        showMessage(
            purpleLeader,
            "Unable to load Purple Cap."
        );


        showMessage(
            purpleCapList,
            error.message
        );

    }

}


// ======================================================
// LOAD PLAYERS
// ======================================================

async function loadPlayers(
    tournamentId
) {

    const players = [];


    try {

        const playersRef =
            collection(
                db,
                "players"
            );


        const q =
            query(
                playersRef,
                where(
                    "tournamentId",
                    "==",
                    tournamentId
                )
            );


        const snapshot =
            await getDocs(q);


        snapshot.forEach(
            (doc) => {

                players.push({

                    id: doc.id,

                    ...doc.data()

                });

            }
        );


    } catch (error) {

        console.log(
            "Players query issue:",
            error.message
        );

    }


    return players;

}


// ======================================================
// LOAD MATCHES
// ======================================================

async function loadMatches(
    tournamentId
) {

    const matches = [];


    try {

        const matchesRef =
            collection(
                db,
                "matches"
            );


        const q =
            query(
                matchesRef,
                where(
                    "tournamentId",
                    "==",
                    tournamentId
                )
            );


        const snapshot =
            await getDocs(q);


        snapshot.forEach(
            (doc) => {

                matches.push({

                    id: doc.id,

                    ...doc.data()

                });

            }
        );


    } catch (error) {

        console.log(
            "Matches query issue:",
            error.message
        );

    }


    return matches;

}


// ======================================================
// CALCULATE WICKETS
// ======================================================

function calculateWickets(
    players,
    matches
) {

    const wicketMap = {};


    // ==========================================
    // ADD REGISTERED PLAYERS
    // ==========================================

    players.forEach(
        (player) => {

            const names = [

                player.playerName,

                player.name,

                player.captainName,

                player.player2,

                player.player3,

                player.player4,

                player.player5,

                player.player6,

                player.player7,

                player.player8,

                player.player9,

                player.player10,

                player.player11,

                player.player12,

                player.player13,

                player.player14,

                player.player15

            ];


            names.forEach(
                (name) => {

                    if (!name) {
                        return;
                    }


                    const cleanName =
                        String(name)
                            .trim();


                    if (!cleanName) {
                        return;
                    }


                    if (
                        !wicketMap[
                            cleanName
                        ]
                    ) {

                        wicketMap[
                            cleanName
                        ] = {

                            playerName:
                                cleanName,

                            wickets: 0,

                            teamName:
                                player.teamName ||
                                ""

                        };

                    }

                }
            );

        }
    );


    // ==========================================
    // READ MATCH RESULTS
    // ==========================================

    matches.forEach(
        (match) => {

            /*
             * Different projects may save
             * wicket information using
             * different field names.
             */

            const possibleBowler =
                match.bowler ||
                match.bowlerName ||
                match.wicketTaker ||
                match.wicketBy;


            if (
                possibleBowler &&
                typeof possibleBowler === "string"
            ) {

                addWicket(
                    wicketMap,
                    possibleBowler,
                    match.teamName
                );

            }


            // ======================================
            // WICKETS ARRAY
            // ======================================

            if (
                Array.isArray(
                    match.wickets
                )
            ) {

                match.wickets.forEach(
                    (wicket) => {

                        if (
                            typeof wicket ===
                            "string"
                        ) {

                            addWicket(
                                wicketMap,
                                wicket,
                                ""
                            );

                        }


                        if (
                            wicket &&
                            typeof wicket ===
                            "object"
                        ) {

                            const name =
                                wicket.bowlerName ||
                                wicket.bowler ||
                                wicket.playerName ||
                                wicket.name;


                            if (name) {

                                addWicket(
                                    wicketMap,
                                    name,
                                    wicket.teamName ||
                                    ""
                                );

                            }

                        }

                    }
                );

            }

        }
    );


    return Object.values(
        wicketMap
    )
        .sort(
            (a, b) =>
                b.wickets -
                a.wickets
        );

}


// ======================================================
// ADD WICKET
// ======================================================

function addWicket(
    wicketMap,
    name,
    teamName
) {

    const cleanName =
        String(name)
            .trim();


    if (!cleanName) {
        return;
    }


    if (
        !wicketMap[
            cleanName
        ]
    ) {

        wicketMap[
            cleanName
        ] = {

            playerName:
                cleanName,

            wickets: 0,

            teamName:
                teamName || ""

        };

    }


    wicketMap[
        cleanName
    ].wickets++;

}


// ======================================================
// PURPLE CAP LEADER
// ======================================================

function renderPurpleLeader(
    players
) {

    if (!purpleLeader) {
        return;
    }


    if (
        !players ||
        players.length === 0
    ) {

        purpleLeader.innerHTML = `

            <h3>
                🟣 No Data
            </h3>

            <p>
                Match wicket data available
                nahi hai.
            </p>

        `;

        return;
    }


    const leader =
        players[0];


    purpleLeader.innerHTML = `

        <h3>
            🟣 ${escapeHTML(
                leader.playerName
            )}
        </h3>

        <p>

            <b>
                Wickets:
            </b>

            ${leader.wickets}

        </p>

        <p>

            <b>
                Team:
            </b>

            ${escapeHTML(
                leader.teamName || "-"
            )}

        </p>

        <span class="status-badge">

            Purple Cap Leader

        </span>

    `;

}


// ======================================================
// PURPLE CAP LIST
// ======================================================

function renderPurpleList(
    players
) {

    if (!purpleCapList) {
        return;
    }


    if (
        !players ||
        players.length === 0
    ) {

        purpleCapList.innerHTML = `

            <div class="empty-teams">

                🏏

                <br><br>

                No wicket data available.

            </div>

        `;

        return;
    }


    purpleCapList.innerHTML = "";


    players.forEach(
        (player, index) => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "team-card-home";


            let medal = "";


            if (index === 0) {
                medal = "🥇";
            }

            else if (index === 1) {
                medal = "🥈";
            }

            else if (index === 2) {
                medal = "🥉";
            }


            card.innerHTML = `

                <h3>

                    ${medal}

                    ${index + 1}.

                    ${escapeHTML(
                        player.playerName
                    )}

                </h3>


                <p>

                    <b>
                        Wickets:
                    </b>

                    ${player.wickets}

                </p>


                <p>

                    <b>
                        Team:
                    </b>

                    ${escapeHTML(
                        player.teamName || "-"
                    )}

                </p>

            `;


            purpleCapList.appendChild(
                card
            );

        }
    );

}


// ======================================================
// MESSAGE
// ======================================================

function showMessage(
    element,
    message
) {

    if (!element) {
        return;
    }


    element.innerHTML = `

        <div class="loading-teams">

            ${escapeHTML(message)}

        </div>

    `;

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ======================================================
// FINAL
// ======================================================

console.log(
    "🟣 PURPLE CAP JAVASCRIPT LOADED"
);