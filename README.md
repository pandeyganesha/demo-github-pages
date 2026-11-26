# Merge Sort Visualizer

An interactive, step-by-step visualizer that teaches how merge sort works. It is plain HTML, CSS and JavaScript, with no build step and no dependencies.

## Features

- Bars that change color to show the left half, the right half, the merged part and the sorted pieces
- A merge workspace that shows the `L` and `R` copies with their `i` and `j` pointers
- A divide-and-conquer tree with one box for each recursive call
- Pseudocode with the current line highlighted, plus the live call stack
- Play/pause, step forward and back, a scrubber to jump to any step, and a speed control
- Random arrays (4–32 items) or your own numbers
- Comparison and write counters
- Keyboard shortcuts: `Space`, `←`, `→`, `R`, `N`
- Works on phones and supports dark mode

## Run locally

Open `index.html` in a browser.

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**. Pick `main` and `/ (root)`, then save.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.
