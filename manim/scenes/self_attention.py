"""Clips for /learnings/self-attention."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, words


class QueryKeyValue(Clip):
    """One word's vector x becomes three: a query, a key and a value, each
    from its own learned matrix. Word i scores word j with q_i . k_j; a
    softmax over j and a weighted sum of the values give word i's new vector.
    Then the numbers for "bit" in the toy "the dog bit the man": dog and man
    score 2 each, the 0, so dog and man pass on the same amount."""

    def construct(self):
        title = words("one word, three vectors", font_size=40, color=FADED).to_edge(UP, buff=0.6)
        self.play(FadeIn(title, shift=0.2 * DOWN))

        rows = VGroup()
        for name, matrix, says in (
            ("q", "Q", "what it looks for"),
            ("k", "K", "what it can be found by"),
            ("v", "V", "what it hands over"),
        ):
            sym = formula(Rf"{name}_i = {matrix}\, x_i", font_size=66)
            note = words(says, font_size=40, color=SAGE)
            rows.add(VGroup(sym, note).arrange(RIGHT, buff=0.6))
        rows.arrange(DOWN, buff=0.45, aligned_edge=LEFT).next_to(title, DOWN, buff=0.7)
        for row in rows:
            self.play(Write(row[0]), FadeIn(row[1], shift=0.2 * LEFT), run_time=1.0)
        self.wait(1.2)

        # Word i asks word j: query against key, then the weights, then the blend
        line, parts = split_formula(
            R"o_i",
            "=",
            R"\sum_j",
            R"\operatorname{softmax}_j\big(",
            R"q_i \cdot k_j",
            R"\big)",
            R"\, v_j",
            font_size=70,
        )
        line.next_to(title, DOWN, buff=0.8)
        score_says = words("how well $j$'s key fits $i$'s query", font_size=40, color=SAGE)
        score_says.next_to(line, DOWN, buff=0.45)
        self.play(FadeOut(rows), run_time=0.6)
        self.play(Write(parts[4]), FadeIn(score_says), run_time=1.0)
        self.wait(0.8)
        blend_says = words("weights that add to 1, then a blend of the values", font_size=40, color=SAGE)
        blend_says.move_to(score_says)
        self.play(
            FadeIn(parts[3]),
            FadeIn(parts[5]),
            FadeIn(parts[2]),
            FadeIn(parts[6]),
            FadeIn(parts[0]),
            FadeIn(parts[1]),
            FadeTransform(score_says, blend_says),
            run_time=1.4,
        )
        self.wait(1.2)

        # The numbers for "bit"
        given = words(R"``bit'' in ``the dog bit the man'', no positions", font_size=40, color=FADED)
        given.next_to(line, DOWN, buff=0.4)
        scores = formula(
            R"q_{\text{bit}} \cdot k_{\text{dog}} = 2,\quad q_{\text{bit}} \cdot k_{\text{man}} = 2,\quad q_{\text{bit}} \cdot k_{\text{the}} = 0",
            font_size=58,
        )
        weights = formula(R"\alpha = 0.42,\quad 0.42,\quad 0.06", font_size=60)
        output = formula(
            R"o_{\text{bit}} = 0.42\, v_{\text{dog}} + 0.42\, v_{\text{man}} + \dots",
            font_size=62,
            color=SAGE,
        )
        VGroup(scores, weights, output).arrange(DOWN, buff=0.35).next_to(given, DOWN, buff=0.45)
        self.play(FadeOut(blend_says), FadeIn(given), run_time=0.6)
        self.play(Write(scores), run_time=1.4)
        self.play(FadeIn(weights, shift=0.2 * DOWN), run_time=0.8)
        self.play(Write(output), run_time=1.2)
        tie = words("dog and man tie: nothing here knows the order", font_size=40, color=INK)
        tie.next_to(output, DOWN, buff=0.4)
        self.play(FadeIn(tie, shift=0.2 * UP))
        self.play(FadeOut(title), VGroup(line, given, scores, weights, output, tie).animate.center(), run_time=0.8)
        self.wait(3)
