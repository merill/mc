export interface Message {
    ActionRequiredByDateTime?: string | null;
    Attachments?: null;
    AttachmentsArchive?: null;
    Body?: Body;
    Category?: string;
    Details?: Detail[];
    EndDateTime?: string;
    HasAttachments?: boolean;
    Id: string;
    IsMajorChange?: boolean;
    LastModifiedDateTime?: string;
    Services?: string[];
    Severity?: string;
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
    ExternalLink = "ExternalLink",
    FeatureStatusJSON = "FeatureStatusJson",
    HelpLink = "HelpLink",
    Platforms = "Platforms",
    RoadmapIDS = "RoadmapIds",
    Summary = "Summary",
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
