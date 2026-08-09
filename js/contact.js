import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


/* =========================
   ELEMENTS
========================= */

const contactCard =
    document.getElementById(
        "contactCard"
    );

const tournamentLink =
    document.getElementById(
        "tournamentLink"
    );

const scheduleLink =
    document.getElementById(
        "scheduleLink"
    );

const resultsLink =
    document.getElementById(
        "resultsLink"
    );

const liveScoreLink =
    document.getElementById(
        "liveScoreLink"
    );

const pointsLink =
    document.getElementById(
        "pointsLink"
    );


/* =========================
   GET TOURNAMENT ID
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );

let tournamentId =
    params.get("id");


if (!tournamentId) {

    tournamentId =
        params.get("tournamentId");

}


if (!tournamentId) {

    tournamentId =
        localStorage.getItem(
            "selectedTournamentId"
        );

}


if (!tournamentId) {

    tournamentId =
        localStorage.getItem(
            "tournamentId"
        );

}


/* =========================
   CHECK ID
========================= */

if (!tournamentId) {

    contactCard.innerHTML = `

        <div class="empty">

            <h2>
                ❌ Tournament ID Missing
            </h2>

            <p>
                Please open Contact
                from a tournament.
            </p>

            <br>

            <a
                href="my-tournaments.html"
                class="btn"
            >
                🏆 My Tournaments
            </a>

        </div>

    `;

    throw new Error(
        "Tournament ID Missing"
    );

}


/* =========================
   SAVE ID
========================= */

localStorage.setItem(
    "tournamentId",
    tournamentId
);

localStorage.setItem(
    "selectedTournamentId",
    tournamentId
);


/* =========================
   NAVIGATION
========================= */

tournamentLink.href =
    "tournament.html?id=" +
    encodeURIComponent(
        tournamentId
    );

scheduleLink.href =
    "schedule.html?id=" +
    encodeURIComponent(
        tournamentId
    );

resultsLink.href =
    "results.html?id=" +
    encodeURIComponent(
        tournamentId
    );

liveScoreLink.href =
    "live-score.html?id=" +
    encodeURIComponent(
        tournamentId
    );

pointsLink.href =
    "points.html?id=" +
    encodeURIComponent(
        tournamentId
    );


/* =========================
   LOAD CONTACT
========================= */

async function loadContact() {

    try {

        const tournamentSnap =
            await getDoc(

                doc(
                    db,
                    "tournaments",
                    tournamentId
                )

            );


        if (
            !tournamentSnap.exists()
        ) {

            contactCard.innerHTML = `

                <div class="empty">

                    <h2>
                        ❌ Tournament Not Found
                    </h2>

                    <p>
                        Tournament ID:
                        <b>${tournamentId}</b>
                    </p>

                </div>

            `;

            return;

        }


        const t =
            tournamentSnap.data();


        const phone =
            t.contact || "";


        const email =
            t.email || "";


        contactCard.innerHTML = `

            <div class="tournament-header">

                <h2>

                    🏆
                    ${
                        t.tournamentName ||
                        "Tournament"
                    }

                </h2>


                <div class="tournament-id">

                    🆔
                    <b>Tournament ID:</b>

                    ${tournamentId}

                </div>

            </div>


            <div class="contact-grid">


                <div class="contact-item">

                    <b>
                        📞 Contact
                    </b>

                    ${
                        phone
                        ?

                        `
                        <a
                            href="tel:${phone}"
                        >
                            ${phone}
                        </a>
                        `

                        :

                        "-"
                    }

                </div>


                <div class="contact-item">

                    <b>
                        📧 Email
                    </b>

                    ${
                        email
                        ?

                        `
                        <a
                            href="mailto:${email}"
                        >
                            ${email}
                        </a>
                        `

                        :

                        "-"
                    }

                </div>


                <div class="contact-item">

                    <b>
                        📍 Venue
                    </b>

                    ${
                        t.venue ||
                        "-"
                    }

                </div>


                <div class="contact-item">

                    <b>
                        📅 Tournament Dates
                    </b>

                    ${
                        t.startDate ||
                        "-"
                    }

                    &nbsp;–&nbsp;

                    ${
                        t.endDate ||
                        "-"
                    }

                </div>


            </div>


            <br>


            <div
                style="
                    background:#f8fafc;
                    padding:18px;
                    border-radius:10px;
                "
            >

                <b>
                    📝 Tournament Information
                </b>

                <br><br>

                ${
                    t.description ||
                    "No additional information available."
                }

            </div>

        `;


    } catch (error) {

        console.error(
            "Contact Error:",
            error
        );


        contactCard.innerHTML = `

            <div class="empty">

                <h2>
                    ❌ Error
                </h2>

                <p>
                    ${error.message}
                </p>

            </div>

        `;

    }

}


/* =========================
   LOGIN
========================= */

onAuthStateChanged(
    auth,
    user => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        loadContact();

    }
);