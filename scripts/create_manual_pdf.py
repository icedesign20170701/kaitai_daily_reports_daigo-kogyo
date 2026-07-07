from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "daigo_daily_report_app_manual_v101.pdf"
APP_URL = "https://report.daigo-kogyo.com/"
VERSION = "1.0.1"
DATE = "2026年7月"
FONT_CANDIDATES = [
    (Path.home() / "Library/Fonts/ZenMaruGothic-Regular.ttf", 0),
    (Path("/System/Library/Fonts/AppleSDGothicNeo.ttc"), 0),
    (Path("/System/Library/Fonts/Supplemental/AppleGothic.ttf"), 0),
]
BOLD_FONT_PATH = Path.home() / "Library/Fonts/ZenMaruGothic-Bold.ttf"


def register_fonts() -> tuple[str, str]:
    for path, subfont_index in FONT_CANDIDATES:
        if not path.exists():
            continue
        try:
            pdfmetrics.registerFont(TTFont("AppJP", str(path), subfontIndex=subfont_index))
            if BOLD_FONT_PATH.exists():
                pdfmetrics.registerFont(TTFont("AppJPBold", str(BOLD_FONT_PATH)))
                return "AppJP", "AppJPBold"
            return "AppJP", "AppJP"
        except Exception:
            continue
    return "HeiseiKakuGo-W5", "HeiseiKakuGo-W5"


FONT, FONT_BOLD = register_fonts()


def jp_text(text: str) -> str:
    return text.replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        "JpTitle",
        parent=styles["Title"],
        fontName=FONT_BOLD,
        fontSize=24,
        leading=34,
        textColor=colors.HexColor("#0f172a"),
        alignment=TA_CENTER,
        spaceAfter=12,
    )
)
styles.add(
    ParagraphStyle(
        "JpSubtitle",
        parent=styles["Normal"],
        fontName=FONT,
        fontSize=12,
        leading=18,
        textColor=colors.HexColor("#475569"),
        alignment=TA_CENTER,
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        "JpH1",
        parent=styles["Heading1"],
        fontName=FONT_BOLD,
        fontSize=18,
        leading=25,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=6,
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        "JpH2",
        parent=styles["Heading2"],
        fontName=FONT_BOLD,
        fontSize=13,
        leading=20,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=8,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        "JpBody",
        parent=styles["BodyText"],
        fontName=FONT,
        fontSize=9.3,
        leading=15,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        "JpSmall",
        parent=styles["BodyText"],
        fontName=FONT,
        fontSize=8.2,
        leading=12,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        "JpBullet",
        parent=styles["BodyText"],
        fontName=FONT,
        fontSize=9.0,
        leading=14,
        textColor=colors.HexColor("#334155"),
        leftIndent=10,
        firstLineIndent=-8,
        spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        "JpTable",
        parent=styles["BodyText"],
        fontName=FONT,
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )
)


class AccentBar(Flowable):
    def __init__(self, width: float = 170 * mm, height: float = 14 * mm):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self) -> None:
        canvas = self.canv
        canvas.saveState()
        canvas.setFillColor(colors.HexColor("#e0f2fe"))
        canvas.setStrokeColor(colors.HexColor("#38bdf8"))
        canvas.roundRect(0, 0, self.width, self.height, 4, fill=1, stroke=1)
        canvas.setFillColor(colors.HexColor("#0f172a"))
        canvas.setFont(FONT_BOLD, 9)
        canvas.drawCentredString(self.width / 2, 5, "株式会社 大吾興業 作業日報アプリ")
        canvas.restoreState()


def p(text: str, style: str = "JpBody") -> Paragraph:
    return Paragraph(jp_text(text), styles[style])


def bullets(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item, "JpBullet"), bulletColor=colors.HexColor("#0284c7")) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=10,
        bulletFontName=FONT,
        bulletFontSize=6,
    )


def section(title: str) -> list:
    return [p(title, "JpH1")]


def subsection(title: str) -> Paragraph:
    return p(title, "JpH2")


def note(title: str, body: str, color: str = "#f8fafc") -> Table:
    data = [[p(title, "JpTable")], [p(body, "JpSmall")]]
    table = Table(data, colWidths=[170 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(color)),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#cbd5e1")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def data_table(headers: list[str], rows: list[list[str]], widths: list[float] | None = None) -> Table:
    data = [[p(h, "JpTable") for h in headers]] + [[p(cell, "JpTable") for cell in row] for row in rows]
    if widths is None:
        widths = [170 * mm / len(headers)] * len(headers)
    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("FONTNAME", (0, 0), (-1, -1), FONT),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def page_header_footer(canvas, doc) -> None:
    canvas.saveState()
    width, height = A4
    if doc.page > 1:
        canvas.setFillColor(colors.HexColor("#64748b"))
        canvas.setFont(FONT, 7.5)
        canvas.drawString(20 * mm, height - 13 * mm, "株式会社 大吾興業 作業日報アプリ 操作マニュアル")
        canvas.drawRightString(width - 20 * mm, height - 13 * mm, f"Version {VERSION}")
        canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
        canvas.line(20 * mm, height - 16 * mm, width - 20 * mm, height - 16 * mm)
    canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
    canvas.line(20 * mm, 14 * mm, width - 20 * mm, 14 * mm)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.setFont(FONT, 7.5)
    canvas.drawString(20 * mm, 8 * mm, APP_URL)
    canvas.drawRightString(width - 20 * mm, 8 * mm, f"{doc.page}")
    canvas.restoreState()


def build_story() -> list:
    story: list = []

    story.extend(
        [
            Spacer(1, 150 * mm),
            AccentBar(),
            Spacer(1, 16 * mm),
            p("作業日報アプリ 操作マニュアル", "JpTitle"),
            p(f"Version {VERSION}", "JpSubtitle"),
            p(DATE, "JpSubtitle"),
            Spacer(1, 55 * mm),
            note(
                "対象",
                "大吾興業グループの作業日報入力・確認・管理を行う担当者向けの操作マニュアルです。旧版マニュアルをベースに、現行画面の変更点を反映しています。",
                "#f1f5f9",
            ),
            PageBreak(),
        ]
    )

    story.extend(section("目次"))
    toc_rows = [
        ["1", "はじめに", "利用前の確認事項、推奨環境、基本ルール"],
        ["2", "ログインと画面構成", "ログイン、サイドバー、スマホ下部メニュー"],
        ["3", "日報一覧", "月移動、絞り込み、CSV出力、詳細確認"],
        ["4", "日報を新規作成する", "入力項目、写真添付、保存"],
        ["5", "日報詳細・編集・削除", "登録済み日報の確認、編集、写真表示"],
        ["6", "現場管理", "現場の追加、編集、稼働停止"],
        ["7", "マスタ管理", "作業員、ラベル、リース、処分、車両、工事分類"],
        ["8", "アカウント設定・権限", "表示名、マスター、外注業者権限"],
        ["9", "通知・運用上の注意", "メール通知、写真、バックグラウンド復帰"],
        ["10", "困ったとき", "よくある確認ポイント"],
    ]
    story.append(data_table(["章", "項目", "内容"], toc_rows, [15 * mm, 50 * mm, 105 * mm]))
    story.append(PageBreak())

    story.extend(section("1. はじめに"))
    story.append(p("このアプリは、現場ごとの作業日報を登録・確認・管理するための業務アプリです。日報入力、写真添付、現場管理、各種マスタ管理、アカウント権限管理を行えます。"))
    story.append(subsection("アクセスURL"))
    story.append(note("URL", APP_URL, "#eff6ff"))
    story.append(subsection("推奨環境"))
    story.append(
        bullets(
            [
                "PC、タブレット、スマートフォンのブラウザで利用できます。",
                "最新版のGoogle Chrome、Microsoft Edge、Safariの利用を推奨します。",
                "スマートフォンでは画面下部のメニュー、PC/タブレットでは左側サイドバーから画面を切り替えます。",
                "ログインアカウントは管理者が発行します。メールアドレスとパスワードを使用してください。",
            ]
        )
    )
    story.append(subsection("基本ルール"))
    story.append(
        bullets(
            [
                "日報は作業日・現場・工事分類・記入者名などを入力して保存します。",
                "記入者名はアカウント設定の表示名をもとに自動入力されます。未設定の場合は保存前に設定してください。",
                "写真は日報に添付できます。登録後は日報詳細画面から拡大表示できます。",
                "権限によって利用できる画面が異なります。",
            ]
        )
    )
    story.append(PageBreak())

    story.extend(section("2. ログインと画面構成"))
    story.append(subsection("ログイン"))
    story.append(
        bullets(
            [
                "ログイン画面でメールアドレスとパスワードを入力します。",
                "ログイン後、日報一覧画面が表示されます。",
                "ログインできない場合は、メールアドレス・パスワード・アカウント登録状況を確認してください。",
            ]
        )
    )
    story.append(subsection("PC/タブレットのサイドバー"))
    story.append(
        bullets(
            [
                "左側のサイドバーから「日報」「現場」「マスタ」「設定」へ移動できます。",
                "サイドバー上部のボタンで、展開表示と縮小表示を切り替えられます。",
                "縮小表示ではアイコンのみ表示されます。各アイコンにカーソルを合わせると項目名を確認できます。",
                "タブレットでは本文の表示領域を確保するため、PCよりサイドバー幅を狭くしています。",
            ]
        )
    )
    story.append(subsection("スマートフォンのメニュー"))
    story.append(
        bullets(
            [
                "スマートフォンでは画面下部のメニューから主要画面へ移動します。",
                "日報入力画面や詳細画面では「一覧へ戻る」ボタンから日報一覧へ戻れます。",
            ]
        )
    )
    story.append(PageBreak())

    story.extend(section("3. 日報一覧"))
    story.append(p("日報一覧では、月ごと・日付ごとに登録済みの日報を確認できます。"))
    story.append(subsection("できること"))
    story.append(
        bullets(
            [
                "表示月を前月・翌月へ移動できます。",
                "件数と延べ人数を確認できます。",
                "現場や記入者で絞り込みできます。",
                "CSV出力ボタンから一覧データを出力できます。",
                "新規入力ボタンから日報作成を開始できます。",
                "各日報を選択すると詳細画面へ移動します。",
            ]
        )
    )
    story.append(
        note(
            "タブレット表示",
            "タブレットでは日報一覧をカード形式で表示します。横幅不足による見切れを防ぐため、表形式はPC幅から表示されます。",
            "#f8fafc",
        )
    )
    story.append(subsection("絞り込み"))
    story.append(
        bullets(
            [
                "開始日・終了日を指定して期間を絞り込めます。",
                "現場を指定して、特定現場の日報だけを表示できます。",
                "記入者を指定して、特定ユーザーの日報だけを表示できます。",
            ]
        )
    )
    story.append(PageBreak())

    story.extend(section("4. 日報を新規作成する"))
    story.append(p("日報一覧の「新規入力」から日報入力画面を開きます。入力後、「保存する」を押すと日報が登録されます。"))
    story.append(subsection("主な入力項目"))
    rows = [
        ["作業日", "日報の対象日を選択します。"],
        ["記入者名", "アカウント設定の表示名が入ります。未設定の場合は設定画面で登録します。"],
        ["現場名", "登録済み現場から選択します。必要に応じて手入力もできます。"],
        ["工事分類", "内装解体工事、土木工事などの分類を選択します。"],
        ["勤務区分", "昼勤・夜勤を選択します。"],
        ["契約区分", "常用・請負を選択します。"],
        ["諸経費", "消耗品等の費用を入力します。"],
        ["リース関係", "利用したリース品・数量を入力します。"],
        ["ゴミ処分", "処分先、種別、トン数、台数を入力します。"],
        ["車両・運搬", "使用車両や運搬台数を入力します。"],
        ["作業員", "作業員ラベルごとに人数を入力します。"],
        ["作業内容・備考", "作業内容、補足事項を入力します。"],
        ["作業進行", "進行状況を選択します。"],
        ["写真", "現場写真を添付できます。"],
    ]
    story.append(data_table(["項目", "説明"], rows, [45 * mm, 125 * mm]))
    story.append(PageBreak())

    story.extend(section("5. 写真添付と日報詳細"))
    story.append(subsection("写真添付"))
    story.append(
        bullets(
            [
                "日報入力画面の「写真を追加」から画像を選択します。",
                "登録済み写真は日報詳細画面に表示されます。",
                "写真はアップロード時にWeb向け形式へ圧縮され、容量を抑えます。",
                "写真アップロードに失敗した場合は、エラーメッセージを確認して再度保存してください。",
            ]
        )
    )
    story.append(subsection("写真の拡大表示"))
    story.append(
        bullets(
            [
                "日報詳細画面の写真をクリックすると、モーダルで拡大表示されます。",
                "複数枚ある場合は、前へ・次へボタンで写真を切り替えられます。",
                "モーダル外をクリックするか閉じる操作で詳細画面へ戻ります。",
            ]
        )
    )
    story.append(subsection("日報詳細・編集・削除"))
    story.append(
        bullets(
            [
                "日報詳細では、登録内容、作業員集計、写真、編集履歴を確認できます。",
                "「編集する」から内容を修正できます。",
                "不要な日報は削除できます。削除すると元に戻せません。",
                "詳細画面から「一覧へ戻る」で日報一覧に戻れます。",
            ]
        )
    )
    story.append(PageBreak())

    story.extend(section("6. 現場管理"))
    story.append(p("現場管理では、日報入力で使用する現場を管理します。"))
    story.append(
        bullets(
            [
                "「現場追加」から新しい現場を追加できます。",
                "既存現場は編集できます。",
                "使用しなくなった現場は削除ではなく「停止」で管理します。",
                "停止した現場は通常の日報入力候補から外れます。",
            ]
        )
    )
    story.append(
        note(
            "運用メモ",
            "過去の日報との整合性を保つため、現場は完全削除ではなく稼働停止で管理します。",
            "#fefce8",
        )
    )
    story.append(PageBreak())

    story.extend(section("7. マスタ管理"))
    story.append(p("マスタ管理では、日報入力で選択する各種項目を管理します。"))
    master_rows = [
        ["工事分類マスタ", "内装解体工事、土木工事などの分類を管理します。"],
        ["作業員マスタ", "従業員一覧を管理します。作業員ラベルに紐づけます。"],
        ["作業員ラベルマスタ", "所属ラベル、単価、日報入力への表示有無を管理します。"],
        ["リース関係マスタ", "リース先・リース項目を管理します。"],
        ["ゴミ処分マスタ", "処分先を管理します。"],
        ["車両・運搬マスタ", "2TC、乗用車などの車両項目を管理します。"],
    ]
    story.append(data_table(["マスタ", "説明"], master_rows, [50 * mm, 120 * mm]))
    story.append(subsection("共通操作"))
    story.append(
        bullets(
            [
                "項目の追加・編集・削除ができます。",
                "表示順はドラッグ操作で並び替えられます。",
                "削除した項目は今後の日報入力では選べなくなりますが、過去の日報データには履歴として残ります。",
            ]
        )
    )
    story.append(PageBreak())

    story.extend(section("8. アカウント設定・権限"))
    story.append(subsection("自分の表示名を設定する"))
    story.append(
        bullets(
            [
                "設定画面から表示名を登録・変更できます。",
                "表示名は日報の記入者名や一覧表示に使われます。",
                "表示名が未設定の場合、日報保存時に入力を求められることがあります。",
            ]
        )
    )
    story.append(subsection("権限の種類"))
    role_rows = [
        ["一般ユーザー", "日報の入力・確認を行います。"],
        ["マスターアカウント", "現場、マスタ、アカウント管理などの管理機能を利用できます。"],
        ["外注業者権限", "日報画面のみ利用できます。現場・マスタ・設定管理画面は利用できません。"],
    ]
    story.append(data_table(["権限", "利用範囲"], role_rows, [45 * mm, 125 * mm]))
    story.append(subsection("アカウント管理"))
    story.append(
        bullets(
            [
                "マスターアカウントは、ユーザーの表示名、マスター権限、外注業者権限を編集できます。",
                "ユーザーはSupabase Authenticationで作成し、app_usersテーブルに権限情報を登録します。",
                "利用しないユーザーはAuthenticationとapp_usersの両方を確認して削除します。",
            ]
        )
    )
    story.append(PageBreak())

    story.extend(section("9. 通知・運用上の注意"))
    story.append(subsection("メール通知"))
    story.append(
        bullets(
            [
                "日報を保存すると、設定済みの宛先へメール通知できます。",
                "通知メールには作業日、現場名、工事分類、記入者、日報URL、日報IDが記載されます。",
                "通知メールの日報URLを開くには、アプリへのログインが必要です。",
            ]
        )
    )
    story.append(subsection("バックグラウンド復帰"))
    story.append(
        bullets(
            [
                "スマートフォンやタブレットで長時間バックグラウンドにした場合、復帰時に再読み込みされることがあります。",
                "5分以上バックグラウンドにした場合は、再ログインが必要になることがあります。",
                "保存前の日報入力中は、できるだけ画面を閉じずに保存してください。",
            ]
        )
    )
    story.append(subsection("検索エンジン対策"))
    story.append(
        bullets(
            [
                "業務アプリのため、検索エンジンに掲載されないようnoindex設定を行っています。",
                "本番公開後はBasic認証を外し、Supabaseログインで利用者を制御する運用を想定しています。",
            ]
        )
    )
    story.append(PageBreak())

    story.extend(section("10. 困ったとき"))
    trouble_rows = [
        ["ログインできない", "メールアドレス、パスワード、アカウント発行状況を確認してください。"],
        ["日報保存時に記入者名を求められる", "設定画面で表示名を登録してください。"],
        ["現場が選べない", "現場管理で対象現場が登録済み・稼働中か確認してください。"],
        ["写真が登録できない", "通信状況、画像容量、アップロードエラー文を確認してください。"],
        ["日報一覧が読み込めない", "画面を再読み込みし、改善しない場合は管理者へ連絡してください。"],
        ["メール通知が届かない", "通知先メールアドレス、迷惑メール、サーバー側メール設定を確認してください。"],
        ["権限画面が見えない", "マスター権限が付与されているか確認してください。"],
    ]
    story.append(data_table(["事象", "確認内容"], trouble_rows, [48 * mm, 122 * mm]))
    story.append(Spacer(1, 10 * mm))
    story.append(note("問い合わせ時に伝える情報", "発生日時、操作していた画面、表示されたエラー文、利用端末（PC/タブレット/スマートフォン）、対象の日報IDが分かる場合は併せて共有してください。", "#f8fafc"))

    return story


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=22 * mm,
        bottomMargin=18 * mm,
        title="大吾興業 作業日報アプリ 操作マニュアル v1.0.1",
        author="icedesign",
    )
    doc.build(build_story(), onFirstPage=page_header_footer, onLaterPages=page_header_footer)
    print(OUTPUT)


if __name__ == "__main__":
    main()
