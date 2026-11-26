import React, { Component } from "react";

export default class Footer extends Component {
    render() {
        return (
            <footer className="mt-auto flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-base-content/20 pt-4 text-sm text-base-content/60">
                <span>
                    Traitors by{" "}
                    <a href="https://www.tannerkrewson.com/" target="_blank">
                        Tanner Krewson
                    </a>
                </span>
                <a
                    href="https://www.tannerkrewson.com/traitors/how-to-play"
                    target="_blank"
                >
                    How to play
                </a>
                <a
                    href="https://github.com/tannerkrewson/traitors"
                    target="_blank"
                >
                    View on GitHub
                </a>
            </footer>
        );
    }
}
