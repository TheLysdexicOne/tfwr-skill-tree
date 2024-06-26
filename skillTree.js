import skills from "./skills.json" with { type: "json" };

document.addEventListener("DOMContentLoaded", (event) => {
    const skillTreeElement = document.getElementById("skillTree");
    const svg = document.getElementById("skillLines");
    if (!skillTreeElement || !svg) {
        console.error("Required elements not found in the DOM.");
        return;
    }
    displaySkills();
});

function displaySkills() {
    const skillTreeElement = document.getElementById("skillTree");
    skillTreeElement.innerHTML = ""; // Clear existing skills

    skills.forEach((skill) => {
        renderSkillElement(skill);
    });

    // Add reset button
    addResetButton();

    // Draw lines after all skills are placed
    skills.forEach((skill) => {
        if (skill.prerequisites && skill.prerequisites.length > 0) {
            const highestPrerequisiteId = Math.max(...skill.prerequisites);
            const prerequisiteSkill = skills.find(
                (s) => s.id === highestPrerequisiteId
            );
            drawConnectors(skill, prerequisiteSkill);
        }
    });
    displaySkillEffects();
}

function renderSkillElement(skill) {
    const skillTreeElement = document.getElementById("skillTree");
    const skillElement = document.createElement("div");
    skillElement.classList.add("skill","noselect");

    // Check if all prerequisites are met
    const prerequisitesMet = skill.prerequisites.every((prerequisiteId) => {
        const prerequisiteSkill = skills.find((s) => s.id === prerequisiteId);
        return prerequisiteSkill && prerequisiteSkill.level > 0;
    });

    // Unlock the skill if prerequisites are met
    if (prerequisitesMet) {
        skill.unlocked = true;
    }

    if (skill.unlocked) {
        skillElement.classList.add("unlocked");
    }

    skillElement.setAttribute("data-id", skill.id);

    // Special handling for skill with id:1
    if (skill.id === 1) {
        skillElement.innerHTML = skill.name; // Only show the name for skill id:1
    } else {
        // Get unlock costs for the next level
        const nextLevel = skill.level + 1;
        const unlockCosts = skill.levelCost[nextLevel]
            ? Object.entries(skill.levelCost[nextLevel])
                  .map(([resource, amount]) => `${resource}: ${amount}`)
                  .join("<br>")
            : "Max Level";

        skillElement.innerHTML = `${skill.name} (${skill.level}/${skill.maxLevel})<br>${unlockCosts}`;
    }

    // Set grid position
    skillElement.style.gridColumnStart = skill.gridPosition.column;
    skillElement.style.gridRowStart = skill.gridPosition.row;

    // Add click event listener to increase skill level only if unlocked and not id:1
    skillElement.addEventListener("click", () => {
        if (skill.unlocked && skill.level < skill.maxLevel && skill.id !== 1) {
            skill.level++;
            displaySkills(); // Re-render the skill tree to reflect the updated levels
        }
    });

    skillElement.addEventListener("contextmenu", (event) => {
        event.preventDefault(); // Prevent the default context menu from appearing
        if (skill.unlocked && skill.level > 0) {
            skill.level--;
            if (
                skill.level === 0 &&
                skill.name !== "Speed" &&
                skill.name !== "Grass"
            ) {
                // Mark the skill as locked, unless it's "Speed" or "Grass"
                skill.unlocked = false;
            }
            // Ensure "Speed" and "Grass" remain unlocked regardless of level
            if (skill.name === "Speed" || skill.name === "Grass") {
                skill.unlocked = true;
            }
            // Find and update skills that rely on this skill
            skills.forEach((dependentSkill) => {
                if (
                    dependentSkill.prerequisites.includes(skill.id) &&
                    dependentSkill.name !== "Speed" &&
                    dependentSkill.name !== "Grass" &&
                    skill.level < 1
                ) {
                    dependentSkill.level = 0;
                    dependentSkill.unlocked = false;
                }
            });
            displaySkills(); // Re-render the skill tree to reflect the updated levels
        }
    });

    skillTreeElement.appendChild(skillElement);
}

function addResetButton() {
    // Check if the reset button already exists
    let resetButton = document.getElementById("resetButton");
    const resetElement = document.createElement("div");
    resetElement.classList.add("noselect");
    if (!resetButton) {
        // If it doesn't exist, create it
        resetButton = document.createElement("button");
        resetButton.textContent = "Reset";
        resetButton.id = "resetButton";
        document.getElementById("skillTree").appendChild(resetButton);

        resetButton.addEventListener("click", function () {
            resetSkills();
        });
    }

    // Ensure the reset button's grid position is correct
    resetButton.style.gridColumnStart = 4;
    resetButton.style.gridRowStart = 1;
}

function resetSkills() {
    // Reset skills to their initial state
    skills.forEach((skill) => {
        skill.unlocked = skill.prerequisites.length === 0 || skill.id === 1; // Assuming 'Start' skill is always unlocked
        skill.level = skill.unlocked ? 1 : 0; // Reset level, assuming 'Start' skill starts at level 1
    });

    // Re-render the skill tree
    displaySkills();
}

function drawConnectors(skill, prerequisiteSkill) {
    const svg = document.getElementById("skillLines");
    if (!svg) return; // Ensure SVG element is present

    // Get elements for skill and prerequisite
    const skillElement = document.querySelector(`[data-id="${skill.id}"]`);
    const prerequisiteElement = document.querySelector(
        `[data-id="${prerequisiteSkill.id}"]`
    );

    if (skillElement && prerequisiteElement) {
        const treeContainerRect = document
            .getElementById("treeContainer")
            .getBoundingClientRect();
        const skillRect = skillElement.getBoundingClientRect();
        const prerequisiteRect = prerequisiteElement.getBoundingClientRect();

        // Get computed styles to extract padding
        const skillStyle = window.getComputedStyle(skillElement);
        const prerequisiteStyle = window.getComputedStyle(prerequisiteElement);

        // Parse padding values
        const skillPadding = {
            left: parseFloat(skillStyle.paddingLeft),
            top: parseFloat(skillStyle.paddingTop),
            right: parseFloat(skillStyle.paddingRight),
            bottom: parseFloat(skillStyle.paddingBottom),
        };
        const prerequisitePadding = {
            left: parseFloat(prerequisiteStyle.paddingLeft),
            top: parseFloat(prerequisiteStyle.paddingTop),
            right: parseFloat(prerequisiteStyle.paddingRight),
            bottom: parseFloat(prerequisiteStyle.paddingBottom),
        };

        let x1, y1, x2, y2, mx, my;

        // Determine centerpoints
        x1 = (skillRect.left + skillRect.right) / 2 - treeContainerRect.left;
        y1 = (skillRect.top + skillRect.bottom) / 2 - treeContainerRect.top;
        x2 =
            (prerequisiteRect.left + prerequisiteRect.right) / 2 -
            treeContainerRect.left;
        y2 =
            (prerequisiteRect.top + prerequisiteRect.bottom) / 2 -
            treeContainerRect.top;

        // y midpoint
        const yMidpoint = (y1 + y2) / 2;

        // If on different tiers
        if (skill.gridPosition.row > prerequisiteSkill.gridPosition.row) {
            // Draw horizontal line at the midpoint
            drawLine(svg, x1, yMidpoint, x2, yMidpoint);
            // Then connect the skill and prerequisite to the midpoint
            drawLine(svg, x1, y1, x1, yMidpoint);
            drawLine(svg, x2, y2, x2, yMidpoint);
        } else {
            // draw straight line to other cell
            drawLine(svg, x1, y1, x2, y2);
        }
    }
}

function drawLine(svg, x1, y1, x2, y2) {
    if (!svg) {
        console.error("SVG element not found.");
        return; // Exit the function if svg is null
    }
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("class", "skillLine");
    svg.appendChild(line);
}

function displaySkillEffects() {
    const skillEffectsElement = document.getElementById("skillEffects");
    skillEffectsElement.innerHTML = ""; // Clear existing skill effects
    const skillsWithEffects = [
        "Speed",
        "Grass",
        "Expand",
        "Pumpkins",
        "Carrots",
        "Trees",
        "Sunflowers",
        "Mazes",
        "Dinosaurs",
        "Cactus",
    ];
    skills
        .filter((skill) => skillsWithEffects.includes(skill.name))
        .forEach((skill) => {
            const effectElement = document.createElement("div");
            effectElement.classList.add("skillEffect","noselect");

            let effectText;
            if (skill.name === "Expand") {
                // Custom progression for Expand
                const expandProgression = {
                    0: "1x1",
                    1: "1x3",
                    2: "3x3",
                    3: "4x4",
                    4: "5x5",
                    5: "6x6",
                    6: "7x7",
                    7: "8x8",
                    8: "9x9",
                    9: "10x10",
                };
                effectText = `Expand<br>${
                    expandProgression[skill.level] ||
                    `${skill.level}x${skill.level}`
                }`;
            } else {
                // Default progression for other skills
                effectText = `${skill.name}<br>${skill.level * 100}%`;
            }
            if (skill.level > 0) {
                effectElement.classList.add("unlocked");
            }
            effectElement.innerHTML = effectText;
            skillEffectsElement.appendChild(effectElement);
        });
}
