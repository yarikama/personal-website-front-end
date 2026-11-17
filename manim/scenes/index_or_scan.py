"""Clips for /learnings/index-or-scan."""

from manimlib import *

from style import FADED, INK, RULE, SAGE, Clip, formula, split_formula, words


class ThreeCosts(Clip):
    """The three plans' costs in symbols, then with the guess's numbers
    dropped in: 5% of 10 million rows on 250,000 pages. The unclustered
    index multiplies the share by the rows, not the pages, and every one of
    them is a trip."""

    def construct(self):
        head = words(R"5\% of 10,000,000 rows on 250,000 pages", font_size=36, color=FADED)
        head.to_edge(UP, buff=0.55)
        self.play(FadeIn(head, shift=0.2 * DOWN))

        rows = [
            dict(
                name="full scan",
                symbols=["B(R)"],
                numbers=[R"250{,}000"],
                result=None,
                note="pages in one run: about 10 s",
                color=SAGE,
            ),
            dict(
                name="unclustered index",
                symbols=["h", "+", "s", R"\cdot", "T(R)"],
                numbers=["3", "+", "0.05", R"\times", R"10{,}000{,}000"],
                result=R"500{,}003",
                note="random reads of 6.04 ms: about 50 min",
                color=INK,
            ),
            dict(
                name="clustered index",
                symbols=["h", "+", "s", R"\cdot", "B(R)"],
                numbers=["3", "+", "0.05", R"\times", R"250{,}000"],
                result=R"12{,}503",
                note="pages, nearly all in one run: about 0.5 s",
                color=SAGE,
            ),
        ]

        left_x = -6.6
        right_x = -1.9
        top_y = 1.9
        step = 2.05
        notes = []
        for i, row in enumerate(rows):
            y = top_y - i * step
            name = words(row["name"], font_size=36, color=FADED)
            name.move_to([0, y + 0.3, 0]).align_to([left_x, 0, 0], LEFT)
            sym, sp = split_formula(*row["symbols"], font_size=52)
            sym.next_to(name, DOWN, buff=0.22).align_to(name, LEFT)

            pieces = row["numbers"] + (["=", row["result"]] if row["result"] else [])
            num, np_ = split_formula(*pieces, font_size=50)
            num.move_to([0, y + 0.3, 0]).align_to([right_x, 0, 0], LEFT)
            note = words(row["note"], font_size=34, color=row["color"])
            note.next_to(num, DOWN, buff=0.28).align_to(num, LEFT)
            notes.append(note)

            self.play(FadeIn(name), Write(sym), run_time=1.2)
            self.wait(0.3)
            # Each number drops in from the symbol it replaces
            n = len(row["symbols"])
            self.play(
                LaggedStart(*(TransformFromCopy(sp[j], np_[j]) for j in range(n)), lag_ratio=0.15),
                run_time=1.6,
            )
            if row["result"]:
                np_[n + 1].set_fill(row["color"])
                self.play(FadeIn(np_[n:], shift=0.2 * LEFT), run_time=0.8)
            else:
                np_[0].set_fill(row["color"])
            self.play(FadeIn(note, shift=0.15 * UP), run_time=0.8)
            self.wait(0.8)

        # The rows, not the pages, and a trip for each
        self.play(Indicate(notes[1], color=INK, scale_factor=1.08), run_time=1.4)
        self.wait(3)
