"""Clips for /learnings/classifier-free-guidance."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, split_words, words


class GuidedGuess(Clip):
    """The rule in words, then in symbols: start from the noise guess made
    without the prompt and walk w times along what the prompt changes. Then
    one pixel's numbers, 0.3 without and 0.5 with, at w = 0, 1 and 7. Then
    the same rule regrouped: past w = 1 the guess without the prompt gets a
    negative weight, so each step is pushed away from it. Ho and Salimans
    write it with s = w - 1."""

    def construct(self):
        said, sp = split_words(
            "guided", "=", "without", "+", "$w$", R"$\times$", "(", "with", R"$-$", "without", ")",
            font_size=40,
        )
        rule, rp = split_formula(
            R"\hat\epsilon", "=", R"\epsilon_\varnothing", "+", "w", R"\big(", R"\epsilon_c", "-", R"\epsilon_\varnothing", R"\big)",
            font_size=64,
            t2c={R"\epsilon_c": SAGE, "w": SAGE},
        )
        said.to_edge(UP, buff=0.9)
        rule.next_to(said, DOWN, buff=0.8)

        self.play(Write(said), run_time=2.2)
        self.wait(0.8)
        # Each word becomes its symbol; "times" goes
        pairs = [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4), (6, 5), (7, 6), (8, 7), (9, 8), (10, 9)]
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), rp[j]) for i, j in pairs), lag_ratio=0.1),
            FadeOut(sp[5]),
            run_time=2.4,
        )
        self.play(FadeOut(said), rule.animate.to_edge(UP, buff=0.8), run_time=0.9)

        # What the prompt changes
        brace = Brace(rp[5:], DOWN, buff=0.12).set_fill(SAGE)
        changes = words("what the prompt changes", font_size=36, color=SAGE).next_to(brace, DOWN, buff=0.15)
        self.play(GrowFromCenter(brace), FadeIn(changes, shift=0.2 * DOWN))
        self.wait(0.8)
        self.play(FadeOut(brace), FadeOut(changes))

        # One pixel's numbers
        given = formula(R"\epsilon_\varnothing = 0.3, \quad \epsilon_c = 0.5", font_size=52, t2c={R"\epsilon_c": SAGE})
        given.next_to(rule, DOWN, buff=0.6)
        self.play(FadeIn(given, shift=0.2 * DOWN))
        rows = VGroup(
            formula(R"w = 0:\quad 0.3 + 0 \times 0.2 = 0.3", font_size=50),
            formula(R"w = 1:\quad 0.3 + 1 \times 0.2 = 0.5", font_size=50),
            formula(R"w = 7:\quad 0.3 + 7 \times 0.2 = 1.7", font_size=50, color=SAGE),
        ).arrange(DOWN, buff=0.3, aligned_edge=LEFT)
        rows.next_to(given, DOWN, buff=0.45)
        notes = VGroup(
            words("prompt ignored", font_size=34, color=FADED),
            words("the plain prompted guess", font_size=34, color=FADED),
            words("past it", font_size=34, color=SAGE),
        )
        for row, note in zip(rows, notes):
            note.next_to(row, RIGHT, buff=0.5)
        for row, note in zip(rows, notes):
            self.play(FadeIn(row, shift=0.15 * UP), FadeIn(note), run_time=0.9)
            self.wait(0.3)
        self.wait(0.8)

        # Regrouped: a negative weight on the guess without the prompt
        self.play(FadeOut(VGroup(given, rows, notes)), run_time=0.7)
        regroup = formula(
            R"\hat\epsilon = (1 - w)\,\epsilon_\varnothing + w\,\epsilon_c",
            font_size=60,
            t2c={R"\epsilon_c": SAGE},
        )
        regroup.next_to(rule, DOWN, buff=0.6)
        self.play(TransformFromCopy(rule, regroup), run_time=1.4)
        seven = formula(R"w = 7:\quad -6\,\epsilon_\varnothing + 7\,\epsilon_c", font_size=52)
        seven.next_to(regroup, DOWN, buff=0.45)
        push = words(R"a weight below zero: pushed away from $\epsilon_\varnothing$", font_size=38, color=SAGE)
        push.next_to(seven, DOWN, buff=0.3)
        self.play(FadeIn(seven, shift=0.15 * UP))
        self.play(FadeIn(push))
        self.wait(0.8)

        paper_says = words("Ho and Salimans write it with $s = w - 1$", font_size=36, color=FADED)
        paper_says.next_to(push, DOWN, buff=0.55)
        paper_form = formula(R"\hat\epsilon = (1 + s)\,\epsilon_c - s\,\epsilon_\varnothing", font_size=52, color=FADED)
        paper_form.next_to(paper_says, DOWN, buff=0.25)
        paper = VGroup(paper_says, paper_form)
        self.play(FadeIn(paper, shift=0.15 * UP), run_time=1.0)
        self.play(VGroup(rule, regroup, seven, push, paper).animate.center(), run_time=0.8)
        self.wait(3)
