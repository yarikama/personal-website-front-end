"""Clips for /learnings/bias-variance."""

from manimlib import *

from style import FADED, INK, SAGE, Clip, formula, split_formula, split_words, words


class ThreeParts(Clip):
    """The average squared miss on a new point, in words and then in
    symbols, split into bias squared, variance and noise; then the numbers
    for a straight line and for degree 9 dropped in under each part."""

    def construct(self):
        # In words, on two lines; the pieces in the formula's order
        first, fp = split_words("average miss$^2$", "=", "(average fit $-$ truth)$^2$", font_size=40)
        second, secp = split_words("+", "spread of fits$^2$", "+", "noise", font_size=40)
        said = VGroup(first, second).arrange(DOWN, buff=0.3)
        sp = VGroup(*fp, *secp)
        rule, rp = split_formula(
            R"\mathbb{E}\big[(y-\hat f)^2\big]", "=", R"(\bar f-f)^2", "+", R"\mathbb{E}\big[(\hat f-\bar f)^2\big]", "+", R"\sigma^2",
            font_size=60,
        )
        if rule.get_width() > 13:
            rule.set_width(13)
        said.to_edge(UP, buff=0.8)
        rule.next_to(said, DOWN, buff=0.9)

        self.play(Write(said), run_time=2.5)
        self.wait(0.8)
        # Each phrase becomes its symbols
        self.play(
            LaggedStart(*(FadeTransform(sp[i].copy(), rp[i]) for i in range(7)), lag_ratio=0.15),
            run_time=2.5,
        )
        self.play(FadeOut(said), rule.animate.to_edge(UP, buff=0.9), run_time=1)

        # Name the three parts
        names = []
        for index, name, color in ((2, "bias$^2$", SAGE), (4, "variance", SAGE), (6, "noise", FADED)):
            brace = Brace(rp[index], DOWN, buff=0.15).set_fill(color)
            label = words(name, font_size=36, color=color).next_to(brace, DOWN, buff=0.15)
            names.append(VGroup(brace, label))
        self.play(LaggedStart(*(FadeIn(n, shift=0.2 * DOWN) for n in names), lag_ratio=0.4), run_time=2)
        self.wait(0.8)

        # The numbers, each under its own part
        rows = []
        top = names[0][1].get_bottom()[1] - 0.8
        for k, (degree, values, worst) in enumerate(
            (("1", ("0.33", "0.22", "0.02", "0.09"), 1), ("9", ("0.68", "0.00", "0.59", "0.09"), 2))
        ):
            y = top - 1.4 * k
            cells = VGroup()
            for part, value in ((0, values[0]), (2, values[1]), (4, values[2]), (6, values[3])):
                color = SAGE if part == 2 * worst else INK
                cell = formula(value, font_size=52, color=color).move_to([rp[part].get_center()[0], y, 0])
                cells.add(cell)
            # Each sign halfway between the numbers either side of it
            ops = VGroup(
                *(
                    formula(op, font_size=52, color=FADED).move_to(
                        [(cells[k].get_right()[0] + cells[k + 1].get_left()[0]) / 2, y, 0]
                    )
                    for k, op in enumerate(("=", "+", "+"))
                )
            )
            tag = words(f"degree {degree}", font_size=32, color=FADED).next_to(cells[0], DOWN, buff=0.12)
            rows.append(VGroup(cells, ops, tag))

        for row in rows:
            cells, ops, tag = row
            self.play(
                LaggedStart(
                    *(TransformFromCopy(rp[part], cell) for part, cell in zip((0, 2, 4, 6), cells)),
                    lag_ratio=0.15,
                ),
                FadeIn(ops),
                FadeIn(tag),
                run_time=2,
            )
            self.wait(0.6)

        # What loses each one its points
        line_loss = words("the line loses to bias", font_size=34, color=SAGE)
        nine_loss = words("degree 9 loses to variance", font_size=34, color=SAGE)
        losses = VGroup(line_loss, nine_loss).arrange(RIGHT, buff=1.2).to_edge(DOWN, buff=0.5)
        self.play(
            Indicate(rows[0][0][1], color=SAGE, scale_factor=1.2),
            FadeIn(line_loss, shift=0.2 * UP),
        )
        self.play(
            Indicate(rows[1][0][2], color=SAGE, scale_factor=1.2),
            FadeIn(nine_loss, shift=0.2 * UP),
        )
        self.wait(3)
