export interface Message {
    ActionRequiredByDateTime?: string | null;
    Attachments?: null;
    AttachmentsArchive?: null;
    Body?: Body;
    Category?: string;
    Details?: Detail[];
    EndDateTime?: string | null;
    HasAttachments?: boolean;
    Id: string;
    IsMajorChange?: boolean;
    LastModifiedDateTime?: string;
    Services?: string[];
    Severity?: string;
    Source?: MessageSource | string;
    StartDateTime?: string;
    Tags?: string[];
    Title: string;
    ViewPoint?: ViewPoint;
    AdditionalProperties?: AdditionalProperties;
}

export interface AdditionalProperties {
}

export interface Body {
    Content?: string;
    ContentType?: string;
    Markdown?: string;
}

export enum ContentType {
    HTML = "html",
}

export enum Category {
    PlanForChange = "planForChange",
    StayInformed = "stayInformed",
}

export interface Detail {
    Name?: string;
    Value?: string;
}

export enum Name {
    BlogLink = "BlogLink",
    CloudInstances = "CloudInstances",
    ExternalLink = "ExternalLink",
    FeatureStatusJSON = "FeatureStatusJson",
    HelpLink = "HelpLink",
    Platforms = "Platforms",
    ReleasePhase = "ReleasePhase",
    RoadmapIDS = "RoadmapIds",
    RoadmapLink = "RoadmapLink",
    SourceId = "SourceId",
    Status = "Status",
    Summary = "Summary",
}

export enum MessageSource {
    MessageCenter = "messageCenter",
    Roadmap = "roadmap",
}

export enum Service {
    AzureInformationProtection = "Azure Information Protection",
    Dynamics365Apps = "Dynamics 365 Apps",
    ExchangeOnline = "Exchange Online",
    Microsoft365Apps = "Microsoft 365 apps",
    Microsoft365ForTheWeb = "Microsoft 365 for the web",
    Microsoft365Suite = "Microsoft 365 suite",
    MicrosoftDefenderForCloudApps = "Microsoft Defender for Cloud Apps",
    MicrosoftDefenderXDR = "Microsoft Defender XDR",
    MicrosoftEntra = "Microsoft Entra",
    MicrosoftForms = "Microsoft Forms",
    MicrosoftIntune = "Microsoft Intune",
    MicrosoftPowerAutomate = "Microsoft Power Automate",
    MicrosoftStream = "Microsoft Stream",
    MicrosoftTeams = "Microsoft Teams",
    MicrosoftViva = "Microsoft Viva",
    OneDriveForBusiness = "OneDrive for Business",
    Planner = "Planner",
    PowerApps = "Power Apps",
    ProjectForTheWeb = "Project for the web",
    SharePointOnline = "SharePoint Online",
}

export enum Severity {
    High = "high",
    Normal = "normal",
}

export enum Tag {
    AdminImpact = "Admin impact",
    FeatureUpdate = "Feature update",
    NewFeature = "New feature",
    Retirement = "Retirement",
    UpdatedMessage = "Updated message",
    UserImpact = "User impact",
}

export interface ViewPoint {
    IsArchived?: null;
    IsFavorited?: null;
    IsRead?: null;
}

export interface MessageArchive {
    Id: string;
    Title: string;
    Services?: string[];
    StartDateTime?: string;
    EndDateTime?: string | null;
    LastModifiedDateTime?: string;
    IsMajorChange?: boolean;
    Category?: string;
}

export interface MessageVersion {
    capturedAt: string;          // ISO timestamp; LastModifiedDateTime if present, else commit author date
    source: "git" | "ingest";    // origin of the snapshot
    sha?: string;                // git commit SHA when source === "git"
    message: Message;            // full message snapshot at this point
}

export interface MessageHistory {
    id: string;
    versions: MessageVersion[];  // chronological asc; last entry is latest
}
